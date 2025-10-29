from fastapi import FastAPI, File, UploadFile
import speech_recognition as sr
import io
from pydub import AudioSegment

app = FastAPI()
r = sr.Recognizer()


@app.get("/")
@app.head("/")
def root():
    return {"message": "This is STT API"}


@app.post("/")
async def upload_file(file: UploadFile = File(...)):
    file_content = await file.read()

    audio_file = io.BytesIO(file_content)

    audio = AudioSegment.from_file(audio_file)
    wav_audio = io.BytesIO()
    audio.export(wav_audio, format="wav")
    wav_audio.seek(0)

    with sr.AudioFile(wav_audio) as source:
        audio_data = r.record(source)

    try:
        text = r.recognize_google(audio_data, language="ja-JP")
    except sr.UnknownValueError:
        text = "音声を理解できませんでした"
    except sr.RequestError:
        text = "RequestError"

    return {"text": text}
