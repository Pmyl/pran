import speech_recognition as sr
import soundfile
import os
import uuid
import re
import pronouncing

# install speech_recognition
# install soundfile
# install numpy
# install pronouncing


class AudioPhonemisedResponse:
    def __init__(self, text, phonemes, audio, samplerate):
        self.text = text
        self.phonemes = phonemes
        self.seconds = len(audio) / samplerate


def phonemise_audio(filepath):
    audio, samplerate = fetch_audio(filepath)
    text = audio_to_text(audio, samplerate)
    phonemes = text_to_phonemes(text)
    return AudioPhonemisedResponse(text, phonemes, audio, samplerate)


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


def text_to_phonemes(text):
    words = text.split()
    sord_to_phn = []
    for word in words:
        pronunciation_list = pronouncing.phones_for_word(word)[0]
        sord_to_phn.append(pronunciation_list)
    sentence_phn = ' '.join(sord_to_phn)
    output = re.sub(r'\d+', '', sentence_phn)
    return output
