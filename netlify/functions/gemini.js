exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { messages, max_tokens, system } = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'API key missing' }) };
    }

    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const body = {
      contents,
      generationConfig: {
        maxOutputTokens: max_tokens || 600,
        temperature: 0.9,
      },
    };

    if (system) {
      body.systemInstruction = { parts: [{ text: system }] };
    }

    // 모델 순서대로 시도
    const models = ['gemini-3-flash-preview', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    let text = '';

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        );
        const data = await response.json();
        text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (text) {
          console.log('성공 모델:', model);
          break;
        } else {
          console.log('빈 응답 모델:', model, JSON.stringify(data).slice(0, 200));
        }
      } catch (modelErr) {
        console.log('모델 오류:', model, modelErr.message);
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: [{ type: 'text', text }] }),
    };
  } catch (err) {
    console.error('함수 오류:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
