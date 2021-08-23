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
    def __init__(self, text, phonemes):
        self.text = text
        self.phonemes = phonemes


def phonemise_audio(filepath):
    text = audio_to_text(filepath)
    phonemes = text_to_phonemes(text)
    return AudioPhonemisedResponse(text, phonemes)


def audio_to_text(filepath):
    r = sr.Recognizer()
    data, samplerate = soundfile.read(filepath)
    newfilename = str(uuid.uuid4()) + ".wav"
    soundfile.write(newfilename, data, samplerate, subtype='PCM_16')
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
