export async function POST(req) {
  const body = await req.json();

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          {
            role: "user",
            content: body.message,
          },
        ],
      }),
    }
  );

  const data = await response.json();

  return Response.json({
    reply: data.choices[0].message.content,
  });
}