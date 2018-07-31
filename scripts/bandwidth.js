const os = require('os');
const speedTest = require('speedtest-net');
const StatsD = require('node-statsd');

const statsHost = process.env.STATSD_HOST;
const statsPort = process.env.STATSD_PORT;
const statsBasePrefix = process.env.STATSD_PREFIX;
const statsSuffix = process.env.STATSD_SUFFIX;

const connectionType = process.argv[2];

if (connectionType === '-h' || connectionType === '--help') {
  console.log(`${process.argv[1]} <connectionType> <host>`);
  process.exit(0);
}

if (!connectionType) {
  console.error();
  console.error('connectionType is required');
  console.log(`${process.argv[1]} <connectionType> <host>`);
  process.exit(1);
}

const validConnectionTypes = ['wifi', 'ethernet'];
if (!validConnectionTypes.includes(connectionType)) {
  console.error();
  console.error(`Invalid connection type: ${connectionType}`);
  console.error(`The connection type should be one of: ${validConnectionTypes.join(', ')}`);
}

let host = process.argv[3] || os.hostname();
host = host.replace('.', '-');

const prefix = [statsBasePrefix, connectionType, host]
  .filter(p => !!p)
  .join('.');

const client = new StatsD(statsHost, statsPort, `${prefix}.`, statsSuffix);

console.log(`${new Date()} - Initializing test... ${prefix}`);

const sendMetric = (metric, data) => {
  console.log(`${new Date()} - ${metric} sending - ${data}`);

  return new Promise((res, rej) => {
    client.gauge(metric, data, (err) => {
      if (err) {
        console.error(err);
        return rej(err);
      }
      console.log(`${new Date()} - ${metric} sent`);
      return res();
    });
  });
};

const test = speedTest({maxTime: 5000});

test.on('data', async (data) => {
  const { speeds } = data;
  const { download, upload } = speeds;
  console.log(`${new Date()} - metrics fired`);
  await Promise.all([sendMetric('upload', upload), sendMetric('download', download)]);
});

test.on('error', err => {
  console.error(err);
  process.exit(1);
});

test.on('done', dataOverload => {
  console.log(`${new Date()} - The speed test has completed successfully.`);
  process.exit(0);
});
