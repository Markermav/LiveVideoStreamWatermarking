import cv2
import numpy as np

def KSA(key):
    key_length = len(key)
    S = list(range(256))
    j = 0
    for i in range(256):
        j = (j + S[i] + key[i % key_length]) % 256
        S[i], S[j] = S[j], S[i]
    return S

def PRGA(S, n):
    i = 0
    j = 0
    keystream = []
    while n > 0:
        n = n - 1
        i = (i + 1) % 256
        j = (j + S[i]) % 256
        S[i], S[j] = S[j], S[i]
        K = S[(S[i] + S[j]) % 256]
        keystream.append(K)
    return keystream

def msgtobinary(msg):
    if type(msg) == str:
        result = ''.join([format(ord(i), "08b") for i in msg])

    elif type(msg) == bytes or type(msg) == np.ndarray:
        result = [format(i, "08b") for i in msg]

    elif type(msg) == int or type(msg) == np.uint8:
        result = format(msg, "08b")

    else:
        raise TypeError("Input type is not supported in this function")

    return result

def preparing_key_array(s):
    return [ord(c) for c in s]

def encryption(plaintext, key):
    S = KSA(key)
    keystream = np.array(PRGA(S, len(plaintext)))
    plaintext = np.array([ord(i) for i in plaintext])
    cipher = keystream ^ plaintext
    ctext = ''.join([chr(c) for c in cipher])
    return ctext

def embed(frame, data):
    data = encryption(data, [10, 20, 30, 40, 50])  # Replace with your desired key
    print("The encrypted data is:", data)
    if len(data) == 0:
        raise ValueError('Data entered to be encoded is empty')

    data += '*^*^*'

    binary_data = msgtobinary(data)
    length_data = len(binary_data)

    index_data = 0

    for i in frame:
        for pixel in i:
            r, g, b = msgtobinary(pixel)
            if index_data < length_data:
                pixel[0] = int(r[:-1] + binary_data[index_data], 2)
                index_data += 1
            if index_data < length_data:
                pixel[1] = int(g[:-1] + binary_data[index_data], 2)
                index_data += 1
            if index_data < length_data:
                pixel[2] = int(b[:-1] + binary_data[index_data], 2)
                index_data += 1
            if index_data >= length_data:
                break
    return frame

def encode_vid_data():
    cap = cv2.VideoCapture("cover_video.mp4")
    vidcap = cv2.VideoCapture("cover_video.mp4")
    fourcc = cv2.VideoWriter_fourcc(*'XVID')
    frame_width = int(vidcap.get(3))
    frame_height = int(vidcap.get(4))

    size = (frame_width, frame_height)
    out = cv2.VideoWriter('stego_video.mp4', fourcc, 25.0, size)
    
    max_frame = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if ret == False:
            break
        max_frame += 1
    cap.release()
    print("Total number of Frames in the selected Video:", max_frame)

    n = 6  # Hardcoded frame number
    frame_number = 0

    while vidcap.isOpened():
        frame_number += 1
        ret, frame = vidcap.read()
        if ret == False:
            break
        if frame_number == n:
            change_frame_with = embed(frame, "HELLO SHITTY WORLD")  # Replace with your data
            frame = change_frame_with
        out.write(frame)

    vidcap.release()
    out.release()

    print("\nEncoded the data successfully in the video file.")

# Call the function to encode data
encode_vid_data()
