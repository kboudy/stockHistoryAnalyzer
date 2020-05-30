const util = require('util'),
  path = require('path'),
  fs = require('fs'),
  exec = util.promisify(require('child_process').exec),
  moment = require('moment');

const today = moment().format('YYYY_MM_DD');

const destinationDir = path.join(
  '/mnt/local_WD_4TB/mongo_backups/stockAnalysis_mongoBackup',
  today
);
if (fs.existsSync(destinationDir)) {
  console.log(`Backup dir already exists: ${destinationDir}`);
  process.exit(1);
}
fs.mkdirSync(destinationDir);

(async () => {
  console.log('Backing up mongo db (within the ubqt_mongo docker container)');
  const { stdoutBackup, stderrBackup } = await exec(
    'docker exec ubqt_mongo sh -c "cd /data && mongodump --db stock_analysis"'
  );

  console.log('moving the dump to the backup dir');
  const { stdoutCopy, stderrCopy } = await exec(
    `docker cp ubqt_mongo:/data/dump "${destinationDir}"`
  );
  const { stdoutRemoveDir, stderrRemoveDir } = await exec(
    'docker exec ubqt_mongo sh -c "rm -rf /data/dump"'
  );
})();
