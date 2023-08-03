const FormData = require('form-data');
const stream = require('stream');
const { PassThrough: PassThroughStream } = require('stream');
const { promisify } = require('util');

const streamPipelinePromisified = promisify(stream.pipeline);

exports.generateFormData = (payload) => {
  const form = new FormData();

  for (const k in payload) {
    form.append(k, payload[k]);
  }
  return form;
};

const bufferStream = () => {
  const streamData = new PassThroughStream({ objectMode: false });
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

exports.getStream = async (inputStream) => {
  if (!inputStream) throw new Error('Expected a stream');

  const streamData = bufferStream();

  await streamPipelinePromisified(inputStream, streamData);

  return streamData.getBufferedValue();
};
