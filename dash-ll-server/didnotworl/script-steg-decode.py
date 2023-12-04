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

def decryption(ciphertext):
    key = [10, 20, 30, 40, 50]  # Replace with your desired key

    S = KSA(key)

    keystream = np.array(PRGA(S, len(ciphertext)))
    ciphertext = np.array([ord(i) for i in ciphertext])

    decoded = keystream ^ ciphertext

    # Convert the result to binary and extract the original message
    binary_data = ''.join([format(c, "08b") for c in decoded])
    end_marker_index = binary_data.find("*^*^*")
    
    if end_marker_index != -1:
        binary_data = binary_data[:end_marker_index]

    # Convert the binary data back to a string
    decoded_message = binarytomsg(binary_data)

    return decoded_message


def binarytomsg(binary_data):
    result = ""
    for i in range(0, len(binary_data), 8):
        byte = binary_data[i:i + 8]
        result += chr(int(byte, 2))
    return result

def extract(frame):
    data_binary = ""
    final_decoded_msg = ""

    for i in frame:
        for pixel in i:
            r, g, b = msgtobinary(pixel)
            data_binary += r[-1]
            data_binary += g[-1]
            data_binary += b[-1]

    end_marker_index = data_binary.find("*^*^*")

    if end_marker_index != -1:
        data_binary = data_binary[:end_marker_index]

        # Ensure the binary data has a valid length (multiple of 8)
        data_binary = data_binary[:-(len(data_binary) % 8)]

        total_bytes = [data_binary[i: i + 8] for i in range(0, len(data_binary), 8)]

        decoded_data = ""

        for byte in total_bytes:
            decoded_data += byte

        # Separate the message from the encoded metadata
        decoded_message = decoded_data.split("*^*^*")[0]
        
        # Apply decryption
        decrypted_message = decryption(decoded_message)

        print("\n\nThe Encoded data hidden in the Video is:\n", decrypted_message)

    return final_decoded_msg



def decode_vid_data():
    cap = cv2.VideoCapture('stego_video.mp4')
    frame_number = 0
    n = 6  # Hardcoded frame number
    
    while cap.isOpened():
        frame_number += 1
        ret, frame = cap.read()
        
        if ret == False:
            break

        if frame_number == n:
            decoded_message = extract(frame)
            print("\n\nThe Encoded data hidden in the Video is:\n", decoded_message)
            break

    cap.release()



# Example usage
decode_vid_data()
