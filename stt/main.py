from fastapi import FastAPI, File, UploadFile, HTTPException
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
    try:
        file_content = await file.read()
        audio_file = io.BytesIO(file_content)

        audio = AudioSegment.from_file(audio_file)
        wav_audio = io.BytesIO()
        audio.export(wav_audio, format="wav")
        wav_audio.seek(0)
    except Exception as e:
        # ファイル変換に失敗した場合
        raise HTTPException(status_code=400, detail=f"Invalid audio file: {str(e)}")

    try:
        with sr.AudioFile(wav_audio) as source:
            audio_data = r.record(source)
        text = r.recognize_google(audio_data, language="ja-JP")
    except sr.UnknownValueError:
        # 音声を理解できなかった場合
        raise HTTPException(status_code=422, detail="音声を理解できませんでした")
    except sr.RequestError as e:
        # Google APIへのリクエスト失敗
        raise HTTPException(
            status_code=503, detail=f"Speech recognition service unavailable: {str(e)}"
        )

    return {"text": text}
