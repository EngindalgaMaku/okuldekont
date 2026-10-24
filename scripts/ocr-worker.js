const { createWorker } = require('tesseract.js');
const path = require('path');

// This function will be called when the main process sends a message
process.on('message', async (message) => {
  const { imageBuffer } = message;

  if (!imageBuffer) {
    process.send({ error: 'Image buffer is missing' });
    return;
  }

  const worker = await createWorker('tur', 1, {
    // We might still need paths depending on the execution context
    langPath: path.join(process.cwd(), 'tessdata'),
  });

  try {
    // Tesseract.js expects a Buffer-like object. Let's ensure it's a proper Buffer.
    const buffer = Buffer.from(imageBuffer);
    const { data } = await worker.recognize(buffer);
    process.send({ result: data });
  } catch (error) {
    process.send({ error: error.message });
  } finally {
    await worker.terminate();
    process.exit(); // Terminate the child process once done
  }
});