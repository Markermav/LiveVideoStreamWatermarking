/*
 * Authors:
 * Abdelhak Bentaleb | National University of Singapore | bentaleb@comp.nus.edu.sg
 * Mehmet N. Akcay | Ozyegin University | necmettin.akcay@ozu.edu.tr
 * May Lim | National University of Singapore | maylim@comp.nus.edu.sg
 */


/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

import FactoryMaker from '../../core/FactoryMaker';

/**
* @module FetchLoader
* @ignore
* @description Manages download of resources via HTTP using fetch.
* @param {Object} cfg - dependencies from parent
*/
function FetchLoader(cfg) {

    cfg = cfg || {};
    const requestModifier = cfg.requestModifier;
    const boxParser = cfg.boxParser;
    let instance;
    let Count = 1;

    function load(httpRequest) {

        // Variables will be used in the callback functions
        const requestStartTime = new Date();
        const request = httpRequest.request;

        const headers = new Headers(); /*jshint ignore:line*/
        if (request.range) {
            headers.append('Range', 'bytes=' + request.range);
        }

        if (!request.requestStartDate) {
            request.requestStartDate = requestStartTime;
        }

        if (requestModifier) {
            // modifyRequestHeader expects a XMLHttpRequest object so,
            // to keep backward compatibility, we should expose a setRequestHeader method
            // TODO: Remove RequestModifier dependency on XMLHttpRequest object and define
            // a more generic way to intercept/modify requests
            requestModifier.modifyRequestHeader({
                setRequestHeader: function (header, value) {
                    headers.append(header, value);
                }
            });
        }

        let abortController;
        if (typeof window.AbortController === 'function') {
            abortController = new AbortController(); /*jshint ignore:line*/
            httpRequest.abortController = abortController;
        }

        const reqOptions = {
            method: httpRequest.method,
            headers: headers,
            credentials: httpRequest.withCredentials ? 'include' : undefined,
            signal: abortController ? abortController.signal : undefined
        };

        fetch(httpRequest.url, reqOptions).then(function (response) {
            if (!httpRequest.response) {
                httpRequest.response = {};
            }
            httpRequest.response.status = response.status;
            httpRequest.response.statusText = response.statusText;
            httpRequest.response.responseURL = response.url;

            if (!response.ok) {
                httpRequest.onerror();
            }

            let responseHeaders = '';
            for (const key of response.headers.keys()) {
                responseHeaders += key + ': ' + response.headers.get(key) + '\n';
            }
            httpRequest.response.responseHeaders = responseHeaders;

            if (!response.body) {
                // Fetch returning a ReadableStream response body is not currently supported by all browsers.
                // Browser compatibility: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
                // If it is not supported, returning the whole segment when it's ready (as xhr)
                return response.arrayBuffer().then(function (buffer) {
                    httpRequest.response.response = buffer;
                    const event = {
                        loaded: buffer.byteLength,
                        total: buffer.byteLength,
                        stream: false
                    };
                    httpRequest.progress(event);
                    httpRequest.onload();
                    httpRequest.onend();
                    return;
                });
            }

            const totalBytes = parseInt(response.headers.get('Content-Length'), 10);
            let bytesReceived = 0;
            let signaledFirstByte = false;
            let remaining = new Uint8Array();
            let offset = 0;

            httpRequest.reader = response.body.getReader();
            let StartTimeData = [];
            let EndTimeData = [];

            const processResult = function ({ value, done }) { // Bug fix Parse whenever data is coming [value] better than 1ms looking that increase CPU
                if (done) {
                    if (remaining) {
                        // If there is pending data, call progress so network metrics
                        // are correctly generated
                        // Same structure as https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequestEventTarget/
                        Count = 1;
                        httpRequest.progress({
                            loaded: bytesReceived,
                            total: isNaN(totalBytes) ? bytesReceived : totalBytes,
                            lengthComputable: true,
                            time: calculateDownloadedTime(StartTimeData, EndTimeData),
                            throughput: calculateThroughputByChunkData(StartTimeData, EndTimeData),
                            stream: true
                        });

                        httpRequest.response.response = remaining.buffer;
                    }
                    httpRequest.onload();
                    httpRequest.onend();
                    return;
                }

                if (value && value.length > 0 ) {
                    remaining = concatTypedArray(remaining, value);
                    bytesReceived += value.length;
                    // Parse the payload and capture the the 'moof' box
                    const Flag1 = boxParser.ParsePayload(['moof'], remaining, offset);
                    if (Flag1.found) {
                        // Store the beginning time of each chunk download in array StartTimeData
                        StartTimeData.push({
                            ts: performance.now(), /* jshint ignore:line */
                            bytes: value.length,
                            id: Count
                        });
                    }
                    Count = Count + 1;
                    const Flag2 = boxParser.findLastTopIsoBoxCompleted(['moov', 'mdat'], remaining, offset);
                    if (Flag2.found) {
                        const end = Flag2.lastCompletedOffset + Flag2.size;
                        // Store the end time of each chunk download  with its size in array EndTimeData
                        EndTimeData.push({
                            tse: performance.now(), /* jshint ignore:line */
                            bytes: remaining.length,
                            id: Count
                        });

                        // If we are going to pass full buffer, avoid copying it and pass
                        // complete buffer. Otherwise clone the part of the buffer that is completed
                        // and adjust remaining buffer. A clone is needed because ArrayBuffer of a typed-array
                        // keeps a reference to the original data
                        let data;
                        if (end === remaining.length) {
                            data = remaining;
                            remaining = new Uint8Array();
                        } else {
                            data = new Uint8Array(remaining.subarray(0, end));
                            remaining = remaining.subarray(end);
                        }
                        // Announce progress but don't track traces. Throughput measures are quite unstable
                        // when they are based in small amount of data
                        httpRequest.progress({
                            data: data.buffer,
                            lengthComputable: false,
                            noTrace: true
                        });

                        offset = 0;
                    } else {
                        offset = Flag2.lastCompletedOffset;
                        // Call progress so it generates traces that will be later used to know when the first byte
                        // were received
                        if (!signaledFirstByte) {
                            httpRequest.progress({
                                lengthComputable: false,
                                noTrace: true
                            });
                            signaledFirstByte = true;
                        }
                    }
                }
                read(httpRequest, processResult);
            };
            read(httpRequest, processResult);
        })
        .catch( function (e) {
            if (httpRequest.onerror) {
                httpRequest.onerror(e);
            }
        });
    }

    function read(httpRequest, processResult) {
        httpRequest.reader.read()
        .then(processResult)
        .catch(function (e) {
            if (httpRequest.onerror && httpRequest.response.status === 200) {
                // Error, but response code is 200, trigger error
                httpRequest.onerror(e);
            }
        });
    }

    function concatTypedArray(remaining, data) {
        if (remaining.length === 0) {
            return data;
        }
        const result = new Uint8Array(remaining.length + data.length);
        result.set(remaining);
        result.set(data, remaining.length);
        return result;
    }

    function abort(request) {
        if (request.abortController) {
            // For firefox and edge
            request.abortController.abort();
        } else if (request.reader) {
            // For Chrome
            try {
                request.reader.cancel();
            } catch (e) {
                // throw exceptions (TypeError) when reader was previously closed,
                // for example, because a network issue
            }
        }
    }

    // Compute the download time of a segment
    function calculateDownloadedTime(downloadedData, bytesReceived) {
        try {
            downloadedData = downloadedData.filter(data => data.bytes > ((bytesReceived / 4) / downloadedData.length));
            if (downloadedData.length > 1) {
                let time = 0;
                const avgTimeDistance = (downloadedData[downloadedData.length - 1].ts - downloadedData[0].ts) / downloadedData.length;
                downloadedData.forEach((data, index) => {
                    // To be counted the data has to be over a threshold
                    const next = downloadedData[index + 1];
                    if (next) {
                        const distance = next.ts - data.ts;
                        time += distance < avgTimeDistance ? distance : 0;
                    }
                });
                return time;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    function calculateThroughputByChunkData(startTimeData, endTimeData) {
        try {
            let datum, datumE;
            // Filter the first and last chunks in a segment in both arrays [StartTimeData and EndTimeData]
            datum = startTimeData.filter((data, i) => i < startTimeData.length - 1);
            datumE = endTimeData.filter((dataE, i) => i < endTimeData.length - 1);
            let chunkThroughputs = [];
            // Compute the average throughput of the filtered chunk data
            if (datum.length > 1) {
                let shortDurationBytesReceived = 0;
                let shortDurationStartTime = 0;
                for (let i = 0; i < datum.length; i++) {
                    if (datum[i] && datumE[i]) {
                        let chunkDownloadTime = datumE[i].tse - datum[i].ts;
                        if (chunkDownloadTime > 1) {
                            chunkThroughputs.push((8 * datumE[i].bytes) / chunkDownloadTime);
                        } else {
                            if (shortDurationStartTime === 0) {
                                shortDurationStartTime = datum[i].ts;
                            }
                            let cumulatedChunkDownloadTime = datumE[i].tse - shortDurationStartTime;
                            if (cumulatedChunkDownloadTime > 1) {
                                chunkThroughputs.push((8 * shortDurationBytesReceived) / cumulatedChunkDownloadTime);
                                shortDurationBytesReceived = 0;
                                shortDurationStartTime = 0;
                            } else {
                                // continue cumulating short duration data
                                shortDurationBytesReceived += datumE[i].bytes;
                            }
                        }
                    }
                }

                if (chunkThroughputs.length > 0) {
                    const sumOfChunkThroughputs = chunkThroughputs.reduce((a, b) => a + b, 0);
                    return sumOfChunkThroughputs / chunkThroughputs.length;
                }
            }

            return null;
        } catch (e) {
            return null;
        }
    }


    instance = {
        load: load,
        abort: abort,
        calculateDownloadedTime: calculateDownloadedTime
    };

    return instance;
}

FetchLoader.__dashjs_factory_name = 'FetchLoader';

const factory = FactoryMaker.getClassFactory(FetchLoader);
export default factory;
