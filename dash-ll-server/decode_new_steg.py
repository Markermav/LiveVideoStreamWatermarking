import os

MARKER = b'\xFF\xD8\xFF\xEE'  # Unique marker for start and end of the message


def extract_message_from_chunk(chunk_data):
    # Find the marker in the chunk data
    marker_index = chunk_data.find(MARKER)

    if marker_index == -1:
        print("Marker not found. Message extraction failed.")
        return ""

    # Extract the message starting from the marker
    binary_message = ''
    message_start = marker_index + len(MARKER)

    # Extract the length of the message (4 bytes)
    message_length_bytes = chunk_data[message_start:message_start + 4]
    message_length = int.from_bytes(message_length_bytes, byteorder='big')

    # Extract the message (in bytes)
    message_bytes = chunk_data[message_start + 4:message_start + 4 + message_length]

    # Convert message bytes to binary
    for byte in message_bytes:
        binary_message += format(byte, '08b')

    # Convert binary message to ASCII characters
    message = ''.join([chr(int(binary_message[i:i + 8], 2)) for i in range(0, len(binary_message), 8)])

    print(f"Decoded Message: {message}")
    return message


def read_m4s_chunk(filename):
    # Read an MPEG-DASH .m4s chunk and return the binary data
    with open(filename, 'rb') as file:
        return file.read()

def decode_folder(input_folder):
    # Initialize an empty string to store the decoded message
    decoded_message = ''
    while True:
    # Iterate over all files in the input folder
        for filename in os.listdir(input_folder):
            if filename.endswith(".m4s"):
                # Read modified MPEG-DASH .m4s chunk
                input_filepath = os.path.join(input_folder, filename)
                modified_m4s_data = read_m4s_chunk(input_filepath)

                # Extract message from modified MPEG-DASH .m4s chunk
                extracted_message = extract_message_from_chunk(modified_m4s_data)

                # Concatenate the extracted message
                decoded_message += extracted_message

    # print("Decoded Message:", decoded_message)

# Example usage
input_folder_decoding = "media/live"

# Extract message from all MPEG-DASH .m4s chunks in the decoding folder
decode_folder(input_folder_decoding)

