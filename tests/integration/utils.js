const FormData = require('form-data');
const { PassThrough: PassThroughStream } = require('stream');
const { pipeline: streamPipeline } = require('stream/promises');

exports.generateFormData = (payload) => {
  const form = new FormData();

  for (const k in payload) {
    form.append(k, payload[k]);
  }
  return form;
};

const bufferStream = () => {
  const streamData = new PassThroughStream();
  streamData.setEncoding('utf8');

  let length = 0;
  const chunks = [];

  streamData.on('data', (chunk) => {
    chunks.push(chunk);
    length += chunk.length;
  });

  streamData.getBufferedValue = () => chunks.join('');

  streamData.getBufferedLength = () => length;

  return streamData;
};

exports.getStream = (inputStream) => {
  if (!inputStream) throw new Error('Expected a stream');

  const streamData = bufferStream();
  streamPipeline(inputStream, streamData);

  return streamData.getBufferedValue();
};
