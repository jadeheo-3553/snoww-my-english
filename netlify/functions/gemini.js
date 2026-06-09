exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { messages, max_tokens, system } = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY;

    // Claude 형식 messages → Gemini 형식 변환
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const body = {
      contents,
      generationConfig: {
        maxOutputTokens: max_tokens || 400,
        temperature: 0.9,
      },
    };

    // system prompt가 있으면 추가
    if (system) {
      body.systemInstruction = { parts: [{ text: system }] };
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    // Gemini 응답 → Claude 형식으로 변환 (HTML이 같은 파싱 코드를 쓰도록)
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: [{ type: 'text', text }]
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
