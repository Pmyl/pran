import speech_recognition as sr
import soundfile
import os
import uuid
import re
from g2p_en import G2p

# install speech_recognition
# install soundfile
# install numpy
# install g2p_en


class AudioPhonemisedResponse:
    def __init__(self, text, phonemes, audio, samplerate):
        self.text = text
        self.phonemes = phonemes
        self.seconds = len(audio) / samplerate


def phonemise_audio(filepath):
    audio, samplerate = fetch_audio(filepath)
    text = audio_to_text(audio, samplerate)
    phonemes = phonemise_text(text)
    return AudioPhonemisedResponse(text, phonemes, audio, samplerate)


def phonemise_text(text):
    g2p = G2p()
    word_to_phn = g2p(text)
    sentence_phn = ' '.join([x for x in word_to_phn if x != ' '])
    output = re.sub(r'\d+', '', sentence_phn)
    return output


def fetch_audio(filepath):
    return soundfile.read(filepath)


def audio_to_text(audio, samplerate):
    newfilename = str(uuid.uuid4()) + ".wav"
    soundfile.write(newfilename, audio, samplerate, subtype='PCM_16')
    r = sr.Recognizer()
    with sr.AudioFile(newfilename) as source:
        audio_data = r.record(source)
        text = r.recognize_google(audio_data)
    os.remove(newfilename)
    return text
