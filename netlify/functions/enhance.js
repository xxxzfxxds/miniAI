const sharp = require('sharp');

exports.handler = async (event) => {
  try {
    // Получаем изображение из запроса
    const { image } = JSON.parse(event.body);
    const buffer = Buffer.from(image, 'base64');

    // Имитация ИИ-обработки (можно заменить на реальную модель)
    const processed = await sharp(buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .modulate({ saturation: 1.2 })
      .sharpen({ sigma: 1.5 })
      .toBuffer();

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        image: processed.toString('base64') 
      }),
    };
  } catch (err) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: err.message }) 
    };
  }
};
