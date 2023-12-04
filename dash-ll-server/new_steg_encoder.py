import os

MARKER = b'\xFF\xD8\xFF\xEE'  # Unique marker for start and end of the message

def embed_message_into_chunk(chunk_data, message):
    # Include the marker, length of the message, and the message in the encoding
    binary_message = f"{len(message):032b}" + ''.join(format(ord(char), '08b') for char in message)

    # Embed the marker and the message in the chunk data
    encoded_data = MARKER + int(binary_message, 2).to_bytes((len(binary_message) + 7) // 8, 'big') + chunk_data

    return encoded_data

def read_m4s_chunk(filename):
    # Read an MPEG-DASH .m4s chunk and return the binary data
    with open(filename, 'rb') as file:
        return file.read()

def write_m4s_chunk(filename, data):
    # Write an MPEG-DASH .m4s chunk with the given binary data
    with open(filename, 'wb') as file:
        file.write(data)

def encode_folder(input_folder, output_folder, message_to_embed):
    # Create the output folder if it doesn't exist
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    # Iterate over all files in the input folder
    for filename in os.listdir(input_folder):
        if filename.endswith(".m4s"):
            # Read MPEG-DASH .m4s chunk
            input_filepath = os.path.join(input_folder, filename)
            m4s_data = read_m4s_chunk(input_filepath)

            # Embed message into MPEG-DASH .m4s chunk
            m4s_data = embed_message_into_chunk(m4s_data, message_to_embed)

            # Write the modified MPEG-DASH .m4s chunk to the output folder
            output_filepath = os.path.join(output_folder, filename)
            write_m4s_chunk(output_filepath, m4s_data)

    print("Message embedded successfully.")

# Example usage
input_folder = "media/live"
output_folder = "media/live1"
message_to_embed = "HELLO THIS MESSAGE IS CRUCIAL FOR VIDEO STREAM"

# Embed message into all MPEG-DASH .m4s chunks in the input folder
encode_folder(input_folder, output_folder, message_to_embed)
