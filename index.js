let fb = new (require('./firebase'))
let logger = new (require('./logging'))
let audio = new (require('./audio'))({ logger: logger })

let managers = [];
managers.push(new (require('./manager.laser'))({ name: 'laser', logger: logger, fb: fb }))
managers.push(new (require('./manager.coin'))({ name: 'zoltar', logger: logger, fb: fb, audio:audio }))

// might want to turn this off while doing dev, so I have a flag for it
let ENABLE_FIREBASE_LOGS = true;
if (ENABLE_FIREBASE_LOGS) {
    logger.enableFirebase(fb.db);
}

logger.log('pi: Started ExitPuzzles Zoltar server.');

// listen for control operations in the db, filter only ops not completed
fb.db.ref('museum/operations').orderByChild('completed').equalTo(null).on("child_added", function(snapshot) {
    logger.log('pi: received op ' + snapshot.val().command);

    managers.forEach((m) => {
        m.handle(snapshot);
    });
 });

// update started time and set a ping timer
fb.db.ref('museum/status/zoltar').update({
    piStarted: (new Date()).toLocaleString(),
    piPing: (new Date()).getTime()
})

// heartbeat timer
setInterval(()  => {
    fb.db.ref('museum/status/zoltar').update({
        piPing: (new Date()).getTime()
    })
}, 30000)