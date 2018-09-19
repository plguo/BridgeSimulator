class Beam {
  constructor(jointA, jointB) {
    this.jointA = jointA;
    this.jointB = jointB;

    this.thickness = 3.0;
    this.color = "#95a5a6";
    this.tensionColor = "#2980b9";
    this.compressionColor = "#e67e22";

    this.quantity = 1;

    this.tensionForce = 0.0;
    this.distributedForce = 0.0;
    this.length = 0.0;

    this.tensionForceLabel = null;
    this.distributedForceLabel = null;
    this.physicalLengthLabel = null;

    this.draggable = false;
  }

  isConnectedToJoint(joint) {
    return this.jointA == joint || this.jointB == joint;
  }

  updateLength(pixelToMeterRatio, unit) {
    var positionA = this.jointA.position;
    var positionB = this.jointB.position;
    this.length = Math.hypot(positionA[1] - positionB[1],
      positionA[0] - positionB[0]);

    this.physicalLength = this.length / pixelToMeterRatio;
    this.physicalLengthLabel = String(+this.physicalLength.toFixed(2)) + unit;
  }

  updateTensionForce(tensionForce, unit) {
    var magnitude = +Math.abs(tensionForce).toFixed(2);
    var direction;
    if (magnitude < 0.0001) {
      direction = "";
    } else if (tensionForce > 0.0) {
      direction = " (T)";
    } else {
      direction = " (C)";
    }

    this.tensionForce = tensionForce;
    this.tensionForceLabel = String(magnitude) + unit + direction;
  }

  updateDistributedForce(distributedForce, unit) {
    this.distributedForce = distributedForce;
    if (distributedForce < 0.0001) {
      this.distributedForceLabel = null;
    } else {
      let value = +(distributedForce).toFixed(2);
      this.distributedForceLabel = `⇃${value}${unit}⇂`;
    }
  }

  invalidateTensionForce() {
    this.tensionForce = 0.0;
    this.tensionForceLabel = null;
  }

  directionVector(joint) {
    if (!this.isConnectedToJoint(joint)) {
      return [0.0, 0.0];
    }

    var positionA = this.jointA.position;
    var positionB = this.jointB.position;
    var dx = (positionB[0] - positionA[0]) / this.length;
    var dy = (positionB[1] - positionA[1]) / this.length;

    if (this.jointA == joint) {
      return [dx, dy];
    } else {
      return [-dx, -dy];
    }
  }

  lineWidth() {
    if (this.quantity > 1) {
      return this.thickness * Math.log2(this.quantity + 1);
    } else {
      return this.thickness * this.quantity;
    }
  }

  center() {
    var positionA = this.jointA.position;
    var positionB = this.jointB.position;

    return [
      (positionA[0] + positionB[0]) / 2.0,
      (positionA[1] + positionB[1]) / 2.0
    ];
  }

  render(context) {
    var positionA = this.jointA.position;
    var positionB = this.jointB.position;

    context.lineWidth = this.lineWidth();

    if (this.selected) {
      context.strokeStyle = "red";
    } else if (!this.tensionForceLabel || Math.abs(this.tensionForce) < 0.001) {
      context.strokeStyle = this.color;
    } else if (this.tensionForce > 0.0) {
      context.strokeStyle = this.tensionColor;
    } else {
      context.strokeStyle = this.compressionColor;
    }

    context.beginPath();
    context.moveTo(positionA[0], positionA[1]);
    context.lineTo(positionB[0], positionB[1]);
    context.stroke();

    if (this.quantity > 1) {
      var center = this.center();

      context.beginPath();
      context.fillStyle = "white";
      context.arc(center[0], center[1], 6.0, 0, 2 * Math.PI);
      context.fill();

      context.fillStyle = "black";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(this.quantity, center[0], center[1]);
    }

    this.renderLabels(context);
  }

  renderLabels(context) {
    var positionA = this.jointA.position;
    var positionB = this.jointB.position;

    var center = [positionA[0] + positionB[0], positionA[1] + positionB[1]];
    center[0] /= 2.0;
    center[1] /= 2.0;

    var angle = Math.atan2(positionA[1] - positionB[1],
      positionA[0] - positionB[0]);

    if (angle > Math.PI / 2) {
      angle -= Math.PI;
    } else if (angle < -Math.PI / 2) {
      angle -= Math.PI;
    }

    context.save();
    context.translate(center[0], center[1]);
    context.rotate(angle);
    context.fillStyle = "black";
    context.textAlign = "center";
    context.textBaseline = "bottom";

    let upperLabels = [this.physicalLengthLabel, this.distributedForceLabel];
    upperLabels = upperLabels.filter(Boolean);
    context.fillText(upperLabels.join(" "), 0, -this.lineWidth());

    if (this.tensionForceLabel) {
      context.fillText(this.tensionForceLabel, 0, this.lineWidth() + 12);
    }

    context.restore();
  }

  containPoint(position) {
    var tolerance = this.lineWidth() / 2 + 3;

    var positionA = this.jointA.position;
    var positionB = this.jointB.position;

    var dx = positionB[0] - positionA[0];
    var dy = positionB[1] - positionA[1];
    var products = positionB[0] * positionA[1] - positionB[1] * positionA[0];

    var distance = Math.abs(dy * position[0] - dx *  position[1] + products );
    distance /= Math.hypot(dx, dy);

    var xBound = [
      Math.min(positionA[0], positionB[0]),
      Math.max(positionA[0], positionB[0])
    ];

    var yBound = [
      Math.min(positionA[1], positionB[1]),
      Math.max(positionA[1], positionB[1])
    ];

    var hit = distance < tolerance;

    hit = hit && position[0] > (xBound[0] - tolerance);
    hit = hit && position[0] < (xBound[1] + tolerance);

    hit = hit && position[1] > (yBound[0] - tolerance);
    hit = hit && position[1] < (yBound[1] + tolerance);

    return hit;
  }
}
