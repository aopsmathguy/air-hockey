const socket = io("https://air-hockey.onrender.com", { transports: ['websocket', 'polling', 'flashsocket'] })
// const socket = io("http://localhost:3000", { transports: ['websocket', 'polling', 'flashsocket'] })

var plyr;
var constants;

var width;
var height;
var gap;
var border;
var physicsStep; //seconds

var scale;
socket.on("start", function(data){
    plyr = data.plyr;
    console.log(plyr)
    constants = f2.parse(data.constants)

    width = constants.width
    height = constants.height
    gap = constants.goalGap
    border = constants.border
    physicsStep = constants.physicsStep //seconds

    scale = Math.min(window.innerWidth / (width + 2 * border), window.innerHeight / (height + 2 * border));
    setupWorld()
})
function pingTest(){
    socket.emit('test', {
        clientSendTime : Date.now()
    })
    setTimeout(pingTest, 3000)
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
socket.on('gameState', function(data){

    world.time = data.wTime - timeDiff + ping/2
    controlsQueue.removeEvents(world.time)
    for (var i = 0;  i < 2; i++){
        pushers[i].updateDynamics(f2.parse(data.pushersDyn[i]))
    }
    puck.updateDynamics(f2.parse(data.puck))
    for (var i = 0;  i < 2; i++){
        mouses[i] = f2.Vec2.copy(data.mouses[i])
    }
})
socket.on('score', function(sc){
    score = sc;
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
var controlsQueue = new ControlsQueue()
controlsQueue.addEventListener('mousemove', (e) => {
    mouses[plyr] = e
})
document.body.addEventListener('mousemove', (e) => {
    var convPos = mouseToBoard(getMousePos(canvas, e))
    socket.emit("mousemove", {
        pos : convPos,
        time : timeDiff + Date.now()/1000 + ping/2
    })
    controlsQueue.addEvent('mousemove', convPos, Date.now()/1000 + ping)
})
document.body.addEventListener("touchstart", function (e) {
    e.preventDefault();
    var touch = e.touches[0];
    var mouseEvent = new MouseEvent("mousedown", {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    document.body.dispatchEvent(mouseEvent);
    mouseEvent = new MouseEvent("mousemove", {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    document.body.dispatchEvent(mouseEvent);
}, false);
document.body.addEventListener("touchend", function (e) {
    e.preventDefault();
    var mouseEvent = new MouseEvent("mouseup", {});
    document.body.dispatchEvent(mouseEvent);
}, false);
document.body.addEventListener("touchmove", function (e) {
    e.preventDefault();
    var touch = e.touches[0];
    var mouseEvent = new MouseEvent("mousemove", {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    document.body.dispatchEvent(mouseEvent);
}, false);

window.addEventListener("scroll", preventMotion, false);
window.addEventListener("touchmove", preventMotion, false);

function preventMotion(event)
{
    window.scrollTo(0, 0);
    event.preventDefault();
    event.stopPropagation();
}
// document.body.addEventListener('keydown', (e) => {
//     ball.position = new f2.Vec2(200, 200)
//     ball.angle = 0
//     ball.velocity = new f2.Vec2(0, 0)
//     ball.angleVelocity = 0
// })

var world;
var pushers = [];
var puck;

var score = [0,0];
function setupWorld() {
    world = new f2.World({ gravity: 0, scale: 1, gridSize: 4, time: Date.now() / 1000 });

    pushers[0] = new f2.CircleBody(constants.pusherBody);
    pushers[0].position = new f2.Vec2(width/2, 0.75 * height)
    world.addBody(pushers[0])

    pushers[1] = new f2.CircleBody(constants.pusherBody);
    pushers[1].position = new f2.Vec2(width/2, 0.25 * height)
    world.addBody(pushers[1])

    puck = new f2.CircleBody(constants.puckBody)
    puck.position = new f2.Vec2(width/2, 0.5 * height)
    // ball = new f2.RectBody({ mass: 1, width: 40, length: 40, position: new f2.Vec2(200, 200) })
    world.addBody(puck);
    var elast = constants.walls.elasticity;
    var kFric = constants.walls.kFriction;
    var sFric = constants.walls.sFriction;
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
    var control = constants.control
    var springLimitDist = constants.springLimitDist
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
    controlsQueue.handleEvents(world.time, dt)
    moveTo(pushers[0], mouses[0], dt)
    moveTo(pushers[1], mouses[1], dt)
    world.step(dt)
    var [plyr1Win, plyr2Win] = [puck.position.y < 0, puck.position.y > height];
    if (plyr1Win || plyr2Win){
        puck.position = new f2.Vec2(width/2, height/2)
        puck.velocity = new f2.Vec2(0,0)
        puck.angle = 0
        puck.angleVelocity = 0
    }
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
function display(ctx){
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
    ctx.save()
    ctx.fillStyle = "rgba(0,0,0,0.4)"
    ctx.font = "5px Arial";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(width/2, height * 0.5)
    if (plyr == 0){
        ctx.fillText("Player 1", 0, 0)
    } else if (plyr == 1){
        ctx.scale(-1,-1)
        ctx.fillText("Player 2", 0, 0)
    } else{
        ctx.scale(-1,-1)
        ctx.fillText("Spectating", 0, 0)
    }
    ctx.translate(0, 5)
    ctx.font = "3px Arial";
    ctx.fillText(score[0] + "-" + score[1], 0, 0)
    ctx.restore()

    ctx.lineWidth = 0.25
    ctx.strokeStyle = "rgba(0,0,0,1)"
    ctx.fillStyle = "rgba(244,244,244,1)"
    world.display(ctx, (now - world.time))
    // ctx.lineWidth = 0.1

    // displayMouse(ctx)
    ctx.restore()

    ctx.save()
    ctx.fillStyle = "rgba(0,0,0,0.4)"
    ctx.font = "20px Arial";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.translate(5, 5)
    ctx.fillText("ping " + Math.round(1000*ping), 0, 0)
    ctx.restore()
}
function gameLoop() {
    if (world){
        now = Date.now() / 1000
        while (world.time < now) {
            step(physicsStep)
        }
        display(ctx)
    }
    requestAnimationFrame(gameLoop)
}
gameLoop()
pingTest()
