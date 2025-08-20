import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { text } = await request.json();
  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  try {
    const apiRes = await fetch(
      "https://api.aivis-project.com/v1/tts/synthesize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.AIVIS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model_uuid: "a59cb814-0083-4369-8542-f51a29e72af7",
          text,
          use_ssml: true,
          output_format: "mp3",
        }),
      }
    );

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return NextResponse.json({ error: errText }, { status: apiRes.status });
    }

    const reader = apiRes.body?.getReader();
    if (!reader) {
      return NextResponse.json(
        { error: "Failed to get audio data" },
        { status: 500 }
      );
    }

    const stream = new ReadableStream({
      start(controller) {
        const pump = async () => {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }
          controller.enqueue(value);
          pump();
        };
        pump();
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
