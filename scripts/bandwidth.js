const speedTest = require('speedtest-net');
const StatsD = require('node-statsd');

const statsHost = process.env.STATSD_HOST;
const statsPort = process.env.STATSD_PORT;
const statsPrefix = process.env.STATSD_PREFIX;
const statsSuffix = process.env.STATSD_SUFFIX;

const client = new StatsD(statsHost, statsPort, statsPrefix, statsSuffix);

console.log('Initializing test...');

const sendMetric = (metric, data) => {
  client.gauge(metric, data, (err) => {
    if (err) return console.error(err);
    console.log(`${new Date()} - ${metric} sent - ${data}`);
  })
};

const test = speedTest({maxTime: 5000});

test.on('data', data => {
  const { speeds } = data;
  const { download, upload } = speeds;
  sendMetric('upload', upload);
  sendMetric('download', download);
  console.log(`${new Date()} - metrics fired`);
});

test.on('error', err => {
  console.error(err);
  process.exit(1);
});

test.on('done', dataOverload => {
  console.log('The speed test has completed successfully.');
  process.exit(0);
});
