# Watermarking Adaptive Video Streams By Manipulating m4s Segments
This project is made on top of LoL + (LoL+ based on Twitch's ACM MMSys 2020 Grand Challenge; support build and test low-latency ABR algorithms locally integrate with  [dash.js referance player v.3.2.0](https://github.com/Dash-Industry-Forum/dash.js))
thanks to our professor(Dr. Abdelhak Bentaleb) who is a co author of LoL+ to allow us to use their work as a base.

# Abstract
Intellectual property integrity is constantly in danger due to digital piracy; hence, creative countermeasures are essential. Conventional watermarking approaches are frequently insufficient against skilled pirates who employ sophisticated techniques. This research introduces a groundbreaking technique to embed binary watermarks in the form of messages during the live ingestion of video streams from servers. This research presents a system developed to encode live binary watermarks seamlessly into .m4s chunks, enhancing the security of digital content without compromising quality. The accompanying decoder, which can be implemented on the player side, facilitates the retrieval of the embedded message during playback. This multifaceted methodology not only bolsters content protection against the prevalent issue of piracy but also establishes superior resilience against removal or distortion techniques. By embedding binary watermarks dynamically during live ingestion, our approach introduces a layer of adaptability that contributes to the robustness of the protection mechanism. This comprehensive approach aims to fortify content protection in the face of rampant piracy, providing superior resilience against removal or distortion techniques. The effectiveness of this watermarking technique is rigorously benchmarked against existing methods across diverse scenarios, indicating its potential as the groundwork for future innovations in this field.

# What's in the Box

- A fork of [Dash.js v3.0.1](https://github.com/Dash-Industry-Forum/dash.js).
- LoL^+ [modules](https://github.com/NUStreaming/LoL-plus/tree/master/dash.js/samples/low-latency/abr): LoLpBitrateSelection.js (new), LoLpQoEEvaluation.js (new), FetchLoader.js (modified), BoxParser.js (modified), and playbackController.js (modified). Note that Bandwdith measurment module is added to FetchLoader and BoxParser.
- A low-latency [DASH server](https://gitlab.com/fflabs/dash_server), setup and configured for ease of use
- ffmpeg for Ubuntu, Debian Bullseye, and MacOS but try to builf ffpeg binary as per your system and replace it in `dash-ll-server` folder
- [LoL^+ Sample Test Page](https://github.com/NUStreaming/LoL-plus/tree/master/dash.js/samples/low-latency)


# Requirements
- Linux (any distro) / MacOs
- python3
- node.js v12+
- Chrome (latest, v85 at the moment)


# How to execute & Encode chunks

- Install each project locally by following their enclosed README
- Start Dash.js by running `grunt dev` in the `dash.js` folder
- In a separate terminal window, start the ingest server by running `bash run_server.sh` in the `dash-ll-server` folder
- This implementation is only made supported for the network profile `PROFILE_FAST` to make it compatible for low specidfication devcies aswell
- To start ingesting give command in dash-ll-server `bash run_gen.sh PROFILE_FAST`
- encoder is already embedded to run_gen.sh which autoimatically activates when ingestion starts, Let it encode the whole stream once and embedd watermark message in all .m4s chunks
- encoder file name : new_steg_encoder.py
- Encoder can be run as a stand alone too on existing ABR chunk folders execute : ```python3 new_steg_encoder.py  ```  // file found under `dash-ll-server` folder

### Decoder: 
- Decoder can be started:   ```python3 decode_new_steg.py  ```  // file found under `dash-ll-server` folder
- Once the whole stream ingestion/encoding is done decoder is already implemented to the script to start automnatically decoding
- But the script is to be embedded in the player side to decode the received chunks, which is our future work.

# Authors:
Kalinga Swain (Concordia University, Montreal) , Jonathan Lupague (Concordia University, Montreal)

# Thanks to:
Dr. Abdelhak Bentaleb for guidance and support.
