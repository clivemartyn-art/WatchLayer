import {backupPilot,restorePilot} from '../dist/regstead/backup.js';

const [command,...args]=process.argv.slice(2);
if(command==='backup'&&args.length===5&&args[4]==='--services-stopped'){
  console.log(JSON.stringify(await backupPilot({database:args[0],engineRoot:args[1],reportRoot:args[2],destination:args[3],servicesStopped:true})));
}else if(command==='restore'&&args.length===2){
  console.log(JSON.stringify(await restorePilot(args[0],args[1])));
}else{
  throw new Error('Usage: backup <commercial.db> <engine-root> <reports-root> <new-backup-directory> --services-stopped | restore <backup-directory> <new-restore-directory>');
}
