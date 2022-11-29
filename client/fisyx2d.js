var f2 = {};
f2.HashGrid = class {
    obj;
    constructor() {
        this.obj = {};
    }
    key(x, y) {
        return x + " " + y;
    }
    clear() {
        this.obj = {};
    }
    add(x, y, elem) {
        var hash = this.key(x, y);
        if (!this.obj[hash]) {
            this.obj[hash] = new Set();
        }
        this.obj[hash].add(elem);
    }
    remove(x, y, elem) {
        var hash = this.key(x, y);
        if (!this.obj[hash]) {
            return;
        }
        this.obj[hash].delete(elem);
    }
    get(x, y) {
        var hash = this.key(x, y);
        return this.obj[hash];
    }
};
f2.Vec2 = class {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    projX() {
        return new f2.Vec2(this.x, 0);
    }
    projY() {
        return new f2.Vec2(0, this.y);
    }
    floor() {
        return new f2.Vec2(Math.floor(this.x), Math.floor(this.y));
    }
    rotate(theta) {
        return new f2.Vec2(this.x * Math.cos(theta) - this.y * Math.sin(theta), this.y * Math.cos(theta) + this.x * Math.sin(theta));
    }
    dot(o) {
        return o.x * this.x + o.y * this.y;
    }
    cross(o) {
        return this.x * o.y - o.x * this.y;
    }
    crossZ(c) {
        return new f2.Vec2(c * this.y, -c * this.x);
    }
    rCrossZ(c) {
        return new f2.Vec2(-c * this.y, c * this.x);
    }
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    abs() {
        return new f2.Vec2(Math.abs(this.x), Math.abs(this.y));
    }
    normalize() {
        var mag = this.magnitude();
        if (mag != 0) {
            return this.multiply(1 / this.magnitude());
        }
        return new f2.Vec2(1, 0);
    }
    normal(to) {
        return this.subtract(to).normalize().rotate(-Math.PI / 2);
    }
    multiplyV(v) {
        return new f2.Vec2(this.x * v.x - this.y * v.y, this.x * v.y + this.y * v.x);
    }
    multiply(n) {
        return new f2.Vec2(this.x * n, this.y * n);
    }
    ang() {
        return Math.atan2(this.y, this.x);
    }
    add(v) {
        return new f2.Vec2(this.x + v.x, this.y + v.y);
    }
    subtract(v) {
        return new f2.Vec2(this.x - v.x, this.y - v.y);
    }
    distanceTo(v) {
        return (this.subtract(v)).magnitude();
    }
    angTo(v) {
        return (this.subtract(v)).ang();
    }
    onSegment(v1, v2) {
        var buffer = 0.001;
        return Math.min(v1.x, v2.x) - buffer <= this.x && this.x <= Math.max(v1.x, v2.x) + buffer && Math.min(v1.y, v2.y) - buffer <= this.y && this.y <= Math.max(v1.y, v2.y) + buffer;
    }
    closestToLine(v1, v2) {
        var x1 = v1.x;
        var y1 = v1.y;
        var x2 = v2.x;
        var y2 = v2.y;

        var e1x = x2 - x1;
        var e1y = y2 - y1;
        var area = e1x * e1x + e1y * e1y;
        var e2x = this.x - x1;
        var e2y = this.y - y1;
        var val = e1x * e2x + e1y * e2y;
        var on = (val > 0 && val < area);

        var lenE1 = Math.sqrt(e1x * e1x + e1y * e1y);
        var lenE2 = Math.sqrt(e2x * e2x + e2y * e2y);
        var cos = val / (lenE1 * lenE2);

        var projLen = cos * lenE2;
        var px = x1 + (projLen * e1x) / lenE1;
        var py = y1 + (projLen * e1y) / lenE1;
        return new f2.Vec2(px, py);
    }
    orientation(v1, v2) {
        var epsilon = 0.001;
        var val = (v2.y - v1.y) * (this.x - v2.x) - (v2.x - v1.x) * (this.y - v2.y);
        if (Math.abs(val) < epsilon) {
            return 0;
        }
        return (val > 0 ? 1 : -1);
    }
    static fromPolar(r, ang) {
        return new f2.Vec2(r * Math.cos(ang), r * Math.sin(ang));
    }
    copy() {
        return new f2.Vec2(this.x, this.y);
    }
    static copy(opts) {
        opts = opts || {};
        return new f2.Vec2(opts.x || 0, opts.y || 0);
    }
};
f2.World = class {
    gravity;
    scale;
    gridSize;

    time;

    allBodies;
    nextId;

    staticBodies;

    dynamicBodies;

    staticBodiesRegions;
    dynamicBodiesRegions;

    contactFilter; //function(obj manifold){return boolean}
    contactListener; // function(obj manifold){}
    constructor(opts) {
        opts = opts || {};
        this.gravity = opts.gravity || 0;
        this.scale = opts.scale || 20;
        this.gridSize = opts.gridSize || 20;

        this.time = opts.time || 0

        this.allBodies = {};
        this.nextId = 0;

        this.staticBodies = {};

        this.dynamicBodies = {};

        this.staticBodiesRegions = new f2.HashGrid();
        this.dynamicBodiesRegions = new f2.HashGrid();

        this.contactFilter = null;
        this.contactListener = null;
    }
    setContactFilter(f) {
        this.contactFilter = f;
    }
    setContactListener(f) {
        this.contactListener = f;
    }
    doContactFilter(manifold) {
        if (this.contactFilter) {
            return this.contactFilter(manifold);
        }
        return true;
    }
    doContactListener(manifold) {
        if (this.contactListener) {
            this.contactListener(manifold);
        }
    }
    dimensionsInMeters() {
        return (new f2.Vec2(innerWidth, innerHeight)).multiply(1 / this.scale);
    }
    transform(ctx, func) {
        ctx.save();
        ctx.scale(this.scale, this.scale);
        func();
        ctx.restore();
    }
    displayRect(ctx, min, max, delT) {
        delT = delT || 0
        ctx.lineWidth = 0.1;
        ctx.strokeStyle = "#000";
        ctx.fillStyle = "rgba(255,255,255,0)";
        var minGrid = this.getGrid(min);
        var maxGrid = this.getGrid(max);
        var idxSet = new Set();
        for (var xGrid = minGrid.x - 1; xGrid <= maxGrid.x + 1; xGrid++) {
            for (var yGrid = minGrid.y - 1; yGrid <= maxGrid.y + 1; yGrid++) {
                var list = this.staticBodiesRegions.get(xGrid, yGrid);
                if (list == undefined) {
                    continue;
                }
                list.forEach((item) => {
                    idxSet.add(item);
                });
            }
        }
        idxSet.forEach((i) => {
            this.staticBodies[i].display(ctx, delT);
        });
        this.updateDynamicf2.HashGrid();
        for (var xGrid = minGrid.x - 1; xGrid <= maxGrid.x + 1; xGrid++) {
            for (var yGrid = minGrid.y - 1; yGrid <= maxGrid.y + 1; yGrid++) {
                var list = this.dynamicBodiesRegions.get(xGrid, yGrid);
                if (list == undefined) {
                    continue;
                }
                list.forEach((item) => {
                    this.dynamicBodies[item].display(ctx, delT);
                });
            }
        }
    }
    display(ctx, delT) {
        delT = delT || 0
        for (var i in this.staticBodies) {
            this.staticBodies[i].display(ctx, delT);
        }
        for (var i in this.dynamicBodies) {
            this.dynamicBodies[i].display(ctx, delT);
        }
    }
    updateDynamicHashGrid() {
        this.dynamicBodiesRegions.clear();
        for (var i in this.dynamicBodies) {
            var body = this.dynamicBodies[i];
            var center = this.getGrid(body.position);
            this.dynamicBodiesRegions.add(center.x, center.y, i);
        }
    }
    getGrid(pos) {
        return pos.multiply(1 / this.gridSize).floor();
    }
    addBody(b) {
        var id = this.nextId++;
        b.id = id;
        this.allBodies[id] = b;
        if (b.mass == Infinity) {
            this.staticBodies[id] = b;
            var poly = b.generateShape();
            var minG = this.getGrid(poly.min);
            var maxG = this.getGrid(poly.max);
            for (var x = minG.x - 1; x <= maxG.x + 1; x++) {
                for (var y = minG.y - 1; y <= maxG.y + 1; y++) {
                    this.staticBodiesRegions.add(x, y, id);
                }
            }
        }
        else {
            this.dynamicBodies[id] = b;
        }
    }
    removeBody(b) {
        var id = b.id;
        delete this.allBodies[id];
        if (b.mass == Infinity) {
            delete this.staticBodies[id];
            var poly = b.generateShape();
            var minG = this.getGrid(poly.min);
            var maxG = this.getGrid(poly.max);
            for (var x = minG.x - 2; x <= maxG.x + 2; x++) {
                for (var y = minG.y - 2; y <= maxG.y + 2; y++) {
                    this.staticBodiesRegions.remove(x, y, id);
                }
            }
        }
        else {
            delete this.dynamicBodies[id];
        }
    }
    getDynamicIntersects(body) {
        var grid = this.getGrid(body.position);
        var s = new Set();
        for (var x = grid.x - 1; x <= grid.x + 1; x++) {
            for (var y = grid.y - 1; y <= grid.y + 1; y++) {
                var toAdd = this.dynamicBodiesRegions.get(x, y);
                if (toAdd == undefined) {
                    continue;
                }
                toAdd.forEach((item) => {
                    s.add(item);
                });
            }
        }
        return Array.from(s);
    }
    getStaticIntersects(body) {
        var grid = this.getGrid(body.position);
        var regions = this.staticBodiesRegions.get(grid.x, grid.y);
        if (!regions) {
            return [];
        }
        return Array.from(regions);
    }
    step(t) {
        this.time += t
        for (var i in this.dynamicBodies) {
            var body = this.dynamicBodies[i];
            body.applyImpulse(new f2.Vec2(0, t * body.mass * this.gravity));
        }
        for (var i in this.dynamicBodies) {
            var body = this.dynamicBodies[i];
            body.integrate(t);
        }


        var moved = new Set();
        for (var i in this.dynamicBodies) {
            moved.add(i);
        }
        this.updateDynamicHashGrid();
        var count = 0;
        // while(moved.size > 0){
        for (var k = 0; k < 10 && moved.size > 0; k++) {
            var newMoved = new Set();
            moved.forEach((i) => {
                var body = this.dynamicBodies[i];
                if (!body) {
                    return;
                }
                var dynamicInt = this.getDynamicIntersects(body);
                for (var j in dynamicInt) {
                    var idx = dynamicInt[j];
                    if (i == idx) {
                        continue;
                    }
                    var oBody = this.dynamicBodies[idx];
                    if (!body) {
                        return;
                    }
                    if (!oBody) {
                        continue;
                    }
                    if (this.doContactFilter({
                        A: body,
                        B: oBody
                    })) {
                        var m = f2.intersect(body, oBody);
                        if (m.moved) {
                            newMoved.add(i);
                            newMoved.add(idx);
                        }
                        if (m.collision) {
                            this.doContactListener(m);
                        }
                    }
                }
                if (!body) {
                    return;
                }
                var staticInt = this.getStaticIntersects(body);
                for (j in staticInt) {
                    var idx = staticInt[j];
                    if (!body) {
                        return;
                    }
                    var oBody = this.staticBodies[idx];
                    if (!oBody) {
                        continue;
                    }
                    if (this.doContactFilter({
                        A: body,
                        B: oBody
                    })) {
                        var m = f2.intersect(body, oBody);
                        if (m.moved) {
                            newMoved.add(i);
                        }
                        if (m.collision) {
                            this.doContactListener(m);
                        }
                    }
                };
            });
            moved = newMoved;
            count++;
        }
    }
};
f2.Circle = class {
    sType = "c";
    center;
    radius;
    min;
    max;
    constructor(center, radius) {
        this.center = center;
        this.radius = radius;
        this.min = center.add(new f2.Vec2(- this.radius, - this.radius));
        this.max = center.add(new f2.Vec2(this.radius, this.radius));
    }
    display(ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.center.x, this.center.y, this.radius, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }
    extremePoint(dir) {
        return this.center.add(dir.multiply(this.radius));
    }
    findAxisOfLeastPen(b) {
        switch (b.sType) {
            case "c":
                var centerDisp = b.center.subtract(this.center);
                var normal = centerDisp.normalize();
                var bestDistance = centerDisp.magnitude() - (b.radius + this.radius);
                var vertex = b.extremePoint(normal.multiply(-1));
                return { normal: normal, penetration: bestDistance, vertex: vertex };
                break;
            //circle vs polygon vertex
            case "p":
                var closestDist = 10000000;
                var vertexIdx;
                for (var i = 0; i < b.vs.length; i++) {
                    var v = b.vs[i];
                    var dist = this.center.distanceTo(v);
                    if (dist < closestDist) {
                        closestDist = dist;
                        vertexIdx = i;
                    }
                }
                var now = b.vs[vertexIdx];
                var next = b.vs[(vertexIdx + 1) % b.vs.length];
                var prev = b.vs[(vertexIdx - 1 + b.vs.length) % b.vs.length];
                var toNext = next.subtract(now);
                var toPrev = prev.subtract(now);
                var toCenter = this.center.subtract(now);
                var normal = toCenter.multiply(-1).normalize();
                var bestDistance = -normal.dot(toCenter) - this.radius;
                if (toCenter.dot(toNext) > 0 || toCenter.dot(toPrev) > 0) {
                    bestDistance = -10000000;
                }
                return { normal: normal, penetration: bestDistance, vertex: now };
                break;
        }
    }
};
f2.Polygon = class {
    sType = "p";
    vs;
    min;
    max;
    constructor(vs) {
        this.vs = vs;
        this.min = new f2.Vec2(10000000, 10000000);
        this.max = new f2.Vec2(-10000000, -10000000);
        for (var i = 0; i < this.vs.length; i++) {
            var point = this.vs[i];
            this.min.x = Math.min(this.min.x, point.x);
            this.min.y = Math.min(this.min.y, point.y);
            this.max.x = Math.max(this.max.x, point.x);
            this.max.y = Math.max(this.max.y, point.y);
        }
    }
    display(ctx) {
        ctx.save();
        ctx.beginPath();
        for (var i = 0; i < this.vs.length; i++) {
            var point = this.vs[i];
            if (i == 0) {
                ctx.moveTo(point.x, point.y);
            }
            else {
                ctx.lineTo(point.x, point.y);
            }
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }
    extremePoint(dir) {
        var bestProj = - 100000000;
        var out;
        for (var i = 0; i < this.vs.length; i++) {
            var v = this.vs[i];
            var proj = v.dot(dir);
            if (proj > bestProj) {
                out = v;
                bestProj = proj;
            }
        }
        return out;
    }
    findAxisOfLeastPen(b) {
        switch (b.sType) {
            //polygon edge vs circle
            case "c":
                var bestDistance = -100000000;
                var normal;
                var vertex;
                for (var i = 0; i < this.vs.length; i++) {
                    var from = this.vs[i];
                    var to = this.vs[(i + 1) % this.vs.length];
                    var n = from.normal(to);
                    var s = b.extremePoint(n.multiply(-1));
                    var v = this.vs[i];
                    var d = n.dot(s.subtract(v));
                    if (d > bestDistance) {
                        bestDistance = d;
                        normal = n;
                        vertex = s;
                    }
                }
                return { normal: normal, penetration: bestDistance, vertex: vertex };
                break;
            case "p":
                var bestDistance = -100000000;
                var normal;
                var vertex;
                for (var i = 0; i < this.vs.length; i++) {
                    var from = this.vs[i];
                    var to = this.vs[(i + 1) % this.vs.length];
                    var n = from.normal(to);
                    var s = b.extremePoint(n.multiply(-1));
                    var v = this.vs[i];
                    var d = n.dot(s.subtract(v));
                    if (d > bestDistance) {
                        bestDistance = d;
                        normal = n;
                        vertex = s;
                    }
                }
                return { normal: normal, penetration: bestDistance, vertex: vertex };
                break;
        }
    }
};
f2.Body = class {
    id;

    mass;
    inertia;
    kFriction;
    sFriction;
    elasticity;

    position;
    _velocity;
    velocity;

    angle;
    _angleVelocity;
    angleVelocity;

    customDisplayPlacement;
    userData;

    static serializedFields = [
        "bodyType", "mass", "inertia", "kFriction", "sFriction", "elasticity", "position", "velocity", "angle", "angleVelocity"
    ];
    static serializedDynamicsFields = [
        "position", "velocity", "angle", "angleVelocity"
    ];
    constructor(opts) {
        opts = opts || {};
        this.id = opts.id || 0;

        this.mass = opts.mass || 1;
        this.inertia = opts.inertia || 1;
        this.kFriction = isNaN(opts.kFriction) ? 0.1 : opts.kFriction;
        this.sFriction = isNaN(opts.sFriction) ? 0.1 : opts.sFriction;
        this.elasticity = opts.elasticity || 0.3;

        this.position = f2.Vec2.copy(opts.position) || new f2.Vec2(0, 0);
        this.velocity = f2.Vec2.copy(opts.velocity) || new f2.Vec2(0, 0);
        this._velocity = this.velocity;

        this.angle = opts.angle || 0;
        this.angleVelocity = opts.angleVelocity || 0;
        this._angleVelocity = this.angleVelocity;

        this.customDisplayPlacement = null;
        this.userData = {};
    }
    static serialize(bd) {
        var objSerialize = {};
        var clss = bd.constructor;
        for (var i = 0; i < clss.serializedFields.length; i++) {
            var f = clss.serializedFields[i];
            objSerialize[f] = bd[f];
        }
        for (var i = 0; i < clss.extraSerializedFields.length; i++) {
            var f = clss.extraSerializedFields[i];
            objSerialize[f] = bd[f];
        }
        return objSerialize;
    }
    static serializeDynamics(bd) {
        var objSerialize = {};
        var clss = bd.constructor;
        for (var i = 0; i < clss.serializedDynamicsFields.length; i++) {
            var f = clss.serializedDynamicsFields[i];
            objSerialize[f] = bd[f];
        }
        return objSerialize;
    }
    static deserialize(bd) {
        return f2.Body.generateBody(bd);
    }
    setUserData(k, v) {
        this.userData[k] = v
    }
    getUserData(k) {
        return this.userData[k]
    }
    createPlacement(delT) {
        return {
            position: this.position.add(this.velocity.multiply(delT)),
            angle: this.angle + this.angleVelocity * delT
        }
    }
    updateDynamics(opts) {
        this.position = f2.Vec2.copy(opts.position);
        this.velocity = f2.Vec2.copy(opts.velocity);

        this.angle = opts.angle;
        this.angleVelocity = opts.angleVelocity;
    }
    setCustomDisplayPlacement(f) {
        this.customDisplayPlacement = f;
    }
    display(ctx, delT) {
        delT = delT || 0
        var plmnt = this.createPlacement(delT)
        this.displayPlacement(ctx, plmnt)
    }
    displayPlacement(ctx, placement) {
        if (this.customDisplayPlacement) {
            this.customDisplayPlacement(ctx, placement);
        }
        else {
            this.defaultDisplayPlacement(ctx, placement);
        }
    }
    static generateBody(opts) {
        if (opts.bodyType == "c") {
            return new f2.CircleBody(opts);
        }
        else if (opts.bodyType == "p") {
            return new f2.PolyBody(opts);
        }
    }
    getVelocity(r) {
        return this.velocity.add(r.rCrossZ(this.angleVelocity));
    }
    getPosition(r) {
        return this.position.add(r.rotate(this.angle));
    }
    applyImpulse(imp, r) {
        r = r || new f2.Vec2(0, 0);
        this.velocity = this.velocity.add(imp.multiply(1 / this.mass));
        this.angleVelocity += 1 / this.inertia * r.cross(imp);
    }
    applyAngImpulse(t) {
        this.angleVelocity += 1 / this.inertia * t;
    }
    applyMassDisplacement(massLength, r) {
        this.position = this.position.add(massLength.multiply(1 / this.mass));
        this.angle += 1 / this.inertia * r.cross(massLength);
    }
    integrate(t) {
        this.position = this.position.add(this.velocity.multiply(t));
        this.angle += (this.angleVelocity) * t;
        this._velocity = this.velocity;
        this._angleVelocity = this.angleVelocity;
    }
};
f2.CircleBody = class extends f2.Body {
    bodyType = "c";
    radius;
    static extraSerializedFields = [
        "radius"
    ];
    constructor(opts) {
        super(opts);
        opts = opts || {};
        this.radius = opts.radius || 1;
        this.inertia = opts.inertia || 1 / 2 * this.mass * this.radius ** 2;
    }
    defaultDisplayPlacement(ctx, placement) {
        ctx.save();
        ctx.translate(placement.position.x, placement.position.y);
        ctx.rotate(placement.angle);

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.moveTo(-this.radius, 0);
        ctx.lineTo(-this.radius / 2, 0);
        ctx.moveTo(this.radius, 0);
        ctx.lineTo(this.radius / 2, 0);
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(0, -this.radius / 2);
        ctx.moveTo(0, this.radius);
        ctx.lineTo(0, this.radius / 2);
        ctx.stroke();

        ctx.restore();
    }
    generateShape() {
        var newCenter = this.position;
        return new f2.Circle(newCenter, this.radius);
    }
};
f2.PolyBody = class extends f2.Body {
    bodyType = "p";
    points;
    static extraSerializedFields = [
        "points"
    ];
    constructor(opts) {
        super(opts);
        opts = opts || {};
        this.points = [];
        if (opts.points == undefined) {
            this.points = [
                new f2.Vec2(1, 1),
                new f2.Vec2(1, -1),
                new f2.Vec2(-1, -1),
                new f2.Vec2(-1, 1)
            ];
        } else {
            for (var i = 0; i < opts.points.length; i++) {
                this.points[i] = f2.Vec2.copy(opts.points[i]);
            }
        }
    }
    defaultDisplayPlacement(ctx, placement) {
        ctx.save();
        ctx.translate(placement.position.x, placement.position.y);
        ctx.rotate(placement.angle);

        ctx.beginPath();
        for (var i = 0; i < this.points.length; i++) {
            var point = this.points[i];
            if (i == 0) {
                ctx.moveTo(point.x, point.y);
            }
            else {
                ctx.lineTo(point.x, point.y);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
    generateShape() {
        var newPoints = [];
        for (var i = 0; i < this.points.length; i++) {
            newPoints[i] = this.points[i].rotate(this.angle).add(this.position);
        }
        return new f2.Polygon(newPoints);
    }
};
f2.RectBody = class extends f2.PolyBody {
    constructor(opts) {
        super(opts);
        opts = opts || {};
        this.width = opts.width || 2;
        this.length = opts.length || 2;
        this.points = [
            new f2.Vec2(this.length / 2, this.width / 2),
            new f2.Vec2(this.length / 2, -this.width / 2),
            new f2.Vec2(-this.length / 2, -this.width / 2),
            new f2.Vec2(-this.length / 2, this.width / 2)
        ];
        this.inertia = opts.inertia || 1 / 12 * this.mass * (this.length ** 2 + this.width ** 2);
    }
};

f2.intersect = function(A, B) {
    var slop = 0.03;

    var APoly = A.generateShape();
    var BPoly = B.generateShape();

    var AEdge = APoly.findAxisOfLeastPen(BPoly);
    var BEdge = BPoly.findAxisOfLeastPen(APoly);
    var edgeBody;
    var vertBody;
    var intersectInfo;
    if (AEdge.penetration > BEdge.penetration) {
        edgeBody = A;
        vertBody = B;
        intersectInfo = AEdge;
    }
    else {
        edgeBody = B;
        vertBody = A;
        intersectInfo = BEdge;
    }
    var normal = intersectInfo.normal;
    var penetration = intersectInfo.penetration;
    if (penetration > -slop) {
        return {
            A: edgeBody,
            B: vertBody,
            moved: false,
            collision: false,
            jnorm: 0,
            jtang: 0,
            norm: normal,
            tang: undefined
        };
    }
    var vertex = intersectInfo.vertex;
    var edge = intersectInfo.vertex.add(normal.multiply(-penetration));

    var rEdge = edge.subtract(edgeBody.position);
    var rVert = vertex.subtract(vertBody.position);

    f2.solvePosition(edgeBody, vertBody, rEdge, rVert, normal, penetration);


    var vEdge = edgeBody.getVelocity(rEdge);
    var vVert = vertBody.getVelocity(rVert);

    var rel = vEdge.subtract(vVert);
    var normRel = normal.dot(rel);
    if (normRel < 0) {
        return {
            A: edgeBody,
            B: vertBody,
            moved: true,
            collision: false,
            jnorm: 0,
            jtang: 0,
            norm: normal,
            tang: undefined
        };
    }

    var elasticity = f2.combinedElasticity(edgeBody.elasticity, vertBody.elasticity);
    var dvel = -(1 + elasticity) * normRel;

    var imp = f2.solveVelocity(edgeBody, vertBody, rEdge, rVert, normal, dvel);
    f2.applyImpulses(edgeBody, vertBody, rEdge, rVert, normal.multiply(imp));

    var tangent = rel.subtract(normal.multiply(rel.dot(normal))).normalize();
    // var tangent = (rel.dot(normal) < 0 ? normal.crossZ(1) : normal.crossZ(-1));

    var relVelAlongTangent = rel.dot(tangent);
    var mu = f2.combinedFrictionCoef(edgeBody.sFriction, vertBody.sFriction)
    var tImp = f2.solveVelocity(edgeBody, vertBody, rEdge, rVert, tangent, -relVelAlongTangent);
    if (Math.abs(tImp) > - imp * mu) {
        var dmu = f2.combinedFrictionCoef(edgeBody.kFriction, vertBody.kFriction);
        tImp = imp * dmu;
    }
    f2.applyImpulses(edgeBody, vertBody, rEdge, rVert, tangent.multiply(tImp));
    return {
        A: edgeBody,
        B: vertBody,
        moved: true,
        collision: true,
        jnorm: imp,
        jtang: tImp,
        norm: normal,
        tang: tangent
    };
};
f2.solvePosition = function(A, B, rA, rB, n, dlength) {
    var normCombinedInvMass = 1 / A.mass + 1 / B.mass + n.cross(rA) ** 2 / A.inertia + n.cross(rB) ** 2 / B.inertia;
    var massMove = (dlength) / normCombinedInvMass;
    A.applyMassDisplacement(n.multiply(massMove), rA);
    B.applyMassDisplacement(n.multiply(-massMove), rB);
    return massMove;
};
f2.solveVelocity = function(A, B, rA, rB, n, dvel) {
    var normCombinedInvMass = 1 / A.mass + 1 / B.mass + n.cross(rA) ** 2 / A.inertia + n.cross(rB) ** 2 / B.inertia;
    var inertia = (dvel) / normCombinedInvMass;
    return inertia;
};
f2.applyImpulses = function(A, B, rA, rB, imp) {
    A.applyImpulse(imp, rA);
    B.applyImpulse(imp.multiply(-1), rB);
};
f2.combinedElasticity = function(e1, e2) {
    return Math.min(e1, e2);
};
f2.combinedFrictionCoef = function(f1, f2) {
    return (f1 ** 2 + f2 ** 2) ** 0.5;
};
f2.AABBvsAABB = function(Amin, Amax, Bmin, Bmax) {
    var aDim = Amax.subtract(Amin);
    var bDim = Bmax.subtract(Bmin);
    var aCenter = Amax.add(Amin).multiply(0.5);
    var bCenter = Bmax.add(Bmin).multiply(0.5);
    var distCenters = aCenter.subtract(bCenter).abs();
    var dimMean = aDim.add(bDim).multiply(0.5);
    return distCenters.x <= dimMean.x && distCenters.y <= dimMean.y;
};

f2.stringify = function(obj){
    return JSON.stringify(obj, function censor(key, value) {
        return value === Infinity ? "Infinity2374852783457827" : value;
    });
}
f2.parse = function(obj){
    return JSON.parse(obj, function censor(key, value) {
        return value === "Infinity2374852783457827" ? Infinity : value;
    });
}
