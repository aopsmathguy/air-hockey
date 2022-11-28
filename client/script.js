const socket = io("http://localhost:3000", { transports: ['websocket', 'polling', 'flashsocket'] })

function pingTest(){
    socket.emit('test', {
        clientSendTime : Date.now()
    })
    setTimeout(pingTest, 5000)
}
var ping = 0;
var timeDiff = 0;
socket.on('test', function(data){
    var clientRecieveTime = Date.now()
    var clientSendTime = data.clientSendTime
    var serverTime = data.serverTime
    var p = clientRecieveTime - clientSendTime;
    var td = serverTime - (clientRecieveTime + clientSendTime)/2

    ping += 0.3 * (p/1000 - ping)
    timeDiff += 0.3 * (td/1000 - timeDiff)
})
var plyr;
socket.on('plyr', function(data){
    plyr = data.plyr;
    console.log(plyr)
})
socket.on('gameState', function(data){
    world.time = data.wTime - timeDiff
    for (var i = 0;  i < 2; i++){
        pushers[i].updateDynamics(data.pushersDyn[i])
    }
    puck.updateDynamics(data.puck)
    for (var i = 0;  i < 2; i++){
        mouses[i] = f2.Vec2.copy(data.mouses[i])
    }
})
function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect(), // abs. size of element
        scaleX = canvas.width / rect.width,    // relationship bitmap vs. element for x
        scaleY = canvas.height / rect.height;  // relationship bitmap vs. element for y

    return new f2.Vec2(
        (evt.clientX - rect.left) * scaleX,   // scale mouse coordinates after they have
        (evt.clientY - rect.top) * scaleY     // been adjusted to be relative to element
    )
}

var canvas = document.createElement("canvas");
var width = 40
var height = 60
var gap = 14
var border = 4
var physicsStep = 0.001 //seconds
var scale = Math.min(window.innerWidth / (width + 2 * border), window.innerHeight / (height + 2 * border));
function mouseToBoard(v) {
    var xRange = [0, width]
    var yRange = [height / 2, height - 3]
    function bind(v) {
        return new f2.Vec2(Math.min(Math.max(v.x, xRange[0]), xRange[1]), Math.min(Math.max(v.y, yRange[0]), yRange[1]))
    }
    var coords = bind(new f2.Vec2(v.x / scale - border, v.y / scale - border))
    if (plyr == 0){
        return coords
    }else{
        return (new f2.Vec2(width, height)).subtract(coords)
    }
}
canvas.width = window.innerWidth
canvas.height = window.innerHeight
var ctx = canvas.getContext("2d");
document.body.appendChild(canvas)

var mouses = []
mouses[0] = new f2.Vec2(width / 2, 0.75 * height);
mouses[1] = new f2.Vec2(width / 2, 0.25 * height);
var controlsDelayer = new ControlsDelayer()
controlsDelayer.addEventListener('mousemove', (e) => {
    mouses[plyr] = e
})
document.body.addEventListener('mousemove', (e) => {
    var convPos = mouseToBoard(getMousePos(canvas, e))
    socket.emit("mousemove", {
        pos : convPos,
        time : timeDiff + Date.now() + ping/2
    })
    controlsDelayer.handleEventDelay('mousemove', convPos, ping / 2)
})
// document.body.addEventListener('keydown', (e) => {
//     ball.position = new f2.Vec2(200, 200)
//     ball.angle = 0
//     ball.velocity = new f2.Vec2(0, 0)
//     ball.angleVelocity = 0
// })

var world;
var pushers = [];
var puck;
function setupWorld() {
    world = new f2.World({ gravity: 0, scale: 1, gridSize: 4, time: Date.now() / 1000 });
    var elast = 0.95
    var kFric = 0.06
    var sFric = 0.1
    pushers[0] = new f2.CircleBody({ mass: 6, radius: 1.9, inertia: Infinity, position: new f2.Vec2(width / 2, 0.75 * height), elasticity: 0, kFriction: kFric, sFriction: sFric });
    world.addBody(pushers[0])

    pushers[1] = new f2.CircleBody({ mass: 6, radius: 1.9, inertia: Infinity, position: new f2.Vec2(width / 2, 0.25 * height), elasticity: 0, kFriction: kFric, sFriction: sFric });
    world.addBody(pushers[1])
    puck = new f2.CircleBody({ mass: 1, radius: 1.6, position: new f2.Vec2(width / 2, 0.7 * height), velocity: new f2.Vec2(0, 5), elasticity: elast, kFriction: kFric, sFriction: sFric })
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
var control = 1000
var springLimitDist = 8
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
}
function displayMouse(ctx) {
    if (plyr != undefined){
        ctx.translate(mouses[plyr].x, mouses[plyr].y)
        ctx.beginPath()
        ctx.moveTo(-1, -1)
        ctx.lineTo(1, 1)
        ctx.moveTo(-1, 1)
        ctx.lineTo(1, -1)
        ctx.stroke();
    }
}
function gameLoop() {
    now = Date.now() / 1000
    while (world.time < now) {
        step(physicsStep)
    }

    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    // ctx.globalAlpha = 0.2
    ctx.save()
    if (plyr == 0){
        ctx.scale(scale, scale)
        ctx.translate(border, border)
    } else{
        ctx.scale(-scale, -scale)
        ctx.translate(-width - border, -height - border)
    }
    ctx.lineWidth = 0.25
    ctx.strokeStyle = "rgba(0,0,0,1)"
    ctx.fillStyle = "rgba(244,244,244,1)"
    world.display(ctx, (now - world.time))
    ctx.lineWidth = 0.5
    ctx.strokeStyle = "rgba(255,0,0,1)"
    // displayMouse(ctx)
    ctx.restore()
    requestAnimationFrame(gameLoop)
}
setupWorld()
gameLoop()
pingTest()
