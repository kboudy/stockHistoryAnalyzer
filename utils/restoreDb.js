const util = require('util'),
  mongoose = require('mongoose'),
  mongoApi = require('../helpers/mongoApi'),
  Confirm = require('prompt-confirm'),
  fs = require('fs'),
  exec = util.promisify(require('child_process').exec);

const DB_NAME = 'stock_analysis';

var args = process.argv.slice(2);
if (args.length !== 1) {
  console.log(
    'Expecting 1 parameter: the restore dir.  ex: "/mnt/local_WD_4TB/mongo_backups/stockAnalysis_mongoBackup/2020_05_30"'
  );
  process.exit(1);
}
const sourceDir = args[0];

if (!fs.existsSync(sourceDir)) {
  console.log(`Source dir doesn't exist: "${sourceDir}"`);
  process.exit(1);
}

(async () => {
  const prompt = new Confirm('This will drop the db.  Are you sure?');
  if (await prompt.run()) {
    console.log('Copying mongo db to docker container');
    const { stdoutBackup, stderrBackup } = await exec(
      `docker cp "${sourceDir}/dump" ubqt_mongo:/data`
    );

    console.log(`Dropping db`);
    try {
      await mongoApi.connectMongoose();
      await mongoose.connection.db.dropDatabase();
      await mongoApi.disconnectMongoose();
    } catch (err) {}

    console.log(`Restoring`);
    const { stdoutCopy, stderrCopy } = await exec(
      `docker exec ubqt_mongo sh -c "cd /data && mongorestore --db ${DB_NAME} ./dump/${DB_NAME}"`
    );
    const { stdoutRemoveDir, stderrRemoveDir } = await exec(
      'docker exec ubqt_mongo sh -c "rm -rf /data/dump"'
    );
    console.log(`Done`);
  }
})();
