const express = require("express");
const socketio = require("socket.io");
const http = require("http");

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "http://localhost:3000/",
    methods: ["GET", "POST"]
  }
});

const { f2 } = require('./fisyx2d.js');
const { ControlsDelayer } = require('./controlsQueue.js');


var width = 40
var height = 60
var gap = 14
var border = 4
var physicsStep = 0.001 //seconds

var mouses = []
mouses[0] = new f2.Vec2(width / 2, 0.75 * height);
mouses[1] = new f2.Vec2(width / 2, 0.25 * height);

var world;
var pushers = [];
var puck;

var clientPlayer = {};
var playerClient = {};
var controlsDelayers = {};
// controlsDelayer.addEventListener('mousemove', (e) => {
//     mouse1 = e
// });

io.on("connection", function onJoin(client){
    if (!playerClient[0]){
        playerClient[0] = client.id
        clientPlayer[client.id] = 0
    } else if (!playerClient[1]){
        playerClient[1] = client.id
        clientPlayer[client.id] = 1
    } else{
        client.emit("error")
        return;
    }
    var plyr = clientPlayer[client.id]
    client.emit("plyr", {plyr : plyr})
    var cd = controlsDelayers[client.id] = new ControlsDelayer()
    cd.addEventListener("mousemove", (e)=>{
        mouses[plyr] = e
    })
    client.on("test", function(data){
        client.emit("test", {clientSendTime : data.clientSendTime, serverTime : Date.now()})
    })
    client.on("mousemove", function(data){
        var delay = Math.max(data.time - Date.now(), 0)
        cd.handleEventDelay('mousemove', data.pos, delay)
    })
    client.on('disconnect', function(){
        delete playerClient[plyr]
        delete clientPlayer[client.id]
    });
})
io.listen(process.env.PORT || 3000)
// document.body.addEventListener('mousemove', (e) => {
//     controlsDelayer.handleEventDelay('mousemove', e, 300)
// })

function setupWorld() {
    world = new f2.World({ gravity: 0, scale: 1, gridSize: 4, time: Date.now() / 1000 });
    var elast = 0.95
    var kFric = 0.06
    var sFric = 0.1
    pushers[0] = new f2.CircleBody({ mass: 6, radius: 1.9, inertia: Infinity, position: new f2.Vec2(width / 2, 0.75 * height), elasticity: 0, kFriction: kFric, sFriction: sFric });
    world.addBody(pushers[0])

    pushers[1] = new f2.CircleBody({ mass: 6, radius: 1.9, inertia: Infinity, position: new f2.Vec2(width / 2, 0.25 * height), elasticity: 0, kFriction: kFric, sFriction: sFric });
    world.addBody(pushers[1])
    puck = new f2.CircleBody({ mass: 1, radius: 1.6, position: new f2.Vec2(width / 2, 0.5 * height), velocity: new f2.Vec2(0, 5), elasticity: elast, kFriction: kFric, sFriction: sFric })
    // ball = new f2.RectBody({ mass: 1, width: 40, length: 40, position: new f2.Vec2(200, 200) })
    world.addBody(puck);

    var rightwall = new f2.RectBody({ mass: Infinity, width: height, length: 2, position: new f2.Vec2(width, height / 2), elasticity: elast, kFriction: kFric, sFriction: sFric })
    world.addBody(rightwall);
    var leftwall = new f2.RectBody({ mass: Infinity, width: height, length: 2, position: new f2.Vec2(0, height / 2), elasticity: elast, kFriction: kFric, sFriction: sFric })
    world.addBody(leftwall);
    var ceiling = new f2.RectBody({ mass: Infinity, width: 2, length: width / 2 - gap / 2, position: new f2.Vec2(width / 4 - gap / 4, 0), elasticity: elast, kFriction: kFric, sFriction: sFric })
    world.addBody(ceiling);
    ceiling = new f2.RectBody({ mass: Infinity, width: 2, length: width / 2 - gap / 2, position: new f2.Vec2(3 * width / 4 + gap / 4, 0), elasticity: elast, kFriction: kFric, sFriction: sFric })
    world.addBody(ceiling);
    var floor = new f2.RectBody({ mass: Infinity, width: 2, length: width / 2 - gap / 2, position: new f2.Vec2(width / 4 - gap / 4, height), elasticity: elast, kFriction: kFric, sFriction: sFric })
    world.addBody(floor);
    floor = new f2.RectBody({ mass: Infinity, width: 2, length: width / 2 - gap / 2, position: new f2.Vec2(3 * width / 4 + gap / 4, height), elasticity: elast, kFriction: kFric, sFriction: sFric })
    world.addBody(floor);
}
function moveTo(body, target, dt) {
    var control = 1000
    var springLimitDist = 8
    damp = 2 * control ** 0.5
    var position = body.position.subtract(target)
    var vel = body.velocity
    var direction = position.normalize()
    var imp = direction.multiply(-Math.min(position.magnitude(), springLimitDist) *
        body.mass * control * dt).add(
            vel.multiply(- body.mass * damp * dt)
        )
    body.applyImpulse(imp)
}
function step(dt) {
    moveTo(pushers[0], mouses[0], dt)
    moveTo(pushers[1], mouses[1], dt)
    world.step(dt)
    if (puck.position.y > height + 5 || puck.position.y < - 5){
        puck.position = new f2.Vec2(width/2, height/2)
        puck.velocity = new f2.Vec2(0,0)
        puck.angle = 0
        puck.angleVelocity = 0
    }
}
function gameLoop() {
    now = Date.now() / 1000
    while (world.time < now) {
        step(physicsStep)
    }
    setTimeout(gameLoop, physicsStep * 1000)
}
function emitLoop(){
    io.sockets.emit('gameState', {
        wTime : world.time,
        pushersDyn : [
            f2.Body.serializeDynamics(pushers[0]),
            f2.Body.serializeDynamics(pushers[1])
        ],
        puck : f2.Body.serializeDynamics(puck),
        mouses : mouses
    });
    setTimeout(emitLoop, 30)
}
setupWorld()
gameLoop()
emitLoop()
