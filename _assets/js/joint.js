class Joint {
  constructor(engine) {
    this.engine = engine;

    this.position = [0.0, 0.0];
    this.moving = false;
    this.selected = false;

    this.stillRadius = 8.0;
    this.motionRadius = 12.0;
    this.color = "#34495e";
    this.selectedColor = "#FF0000";

    this.baseLength = 10.0;

    this.jointType = null;

    this.applyForce = 0.0;
    this.force = 0.0;

    this.positionLock = {x: false, y: false};
    this.draggable = true;

    this.showPosition = true;
    this.positionLabel = null;

    this.mirrorJoint = null
  }

  updatePosition(position, {ignoreLock = false, ignoreMirror = false} = {}) {
    if (ignoreLock || !this.positionLock.x) this.position[0] = position[0];
    if (ignoreLock || !this.positionLock.y) this.position[1] = position[1];

    let physicalPosition = this.engine.translateToCartesianPosition(this.position);
    this.positionLabel = [
      +physicalPosition[0].toFixed(2),
      +physicalPosition[1].toFixed(2)
    ].join(", ");

    if (!ignoreMirror && this.mirrorJoint){
      this.mirrorJoint.updatePosition(this.getMirroredPosition(),
        {ignoreLock: true, ignoreMirror: true});
    }
  }

  getMirroredPosition() {
    return [
      this.engine.mirrorX * 2 - this.position[0],
      this.position[1]
    ];
  }

  render(context) {
    var radius = this.moving ? this.motionRadius : this.stillRadius;

    context.lineWidth = 0;
    context.fillStyle = this.selected ? this.selectedColor : this.color;

    context.beginPath();
    context.arc(this.position[0], this.position[1], radius, 0, 2 * Math.PI);
    context.fill();

    if (this.showPosition && this.positionLabel) {
      context.textAlign = "center";
      context.fillText(this.positionLabel, this.position[0],
        this.position[1] - 14);
    }

    if (this.jointType) {
      if (this.jointType == 'f') {
        this.renderFixedJoint(context);
      } else if (this.jointType == 's') {
        this.renderSlideJoint(context);
      }
    }

    if (this.force > 0.001) {
      this.renderForce(context);
    }
  }

  renderFixedJoint(context) {
    this.renderTriangle(context);

    context.beginPath();
    for (var i = -1; i <= 1; i++) {
      context.moveTo(this.position[0] + 2.5 + i * 5, this.position[1] + 15);
      context.lineTo(this.position[0] - 2.5 + i * 5, this.position[1] + 20);
    }
    context.stroke();
  }

  renderSlideJoint(context) {
    this.renderTriangle(context);

    context.beginPath();
    context.moveTo(this.position[0] - 10, this.position[1] + 20);
    context.lineTo(this.position[0] + 10, this.position[1] + 20);
    context.stroke();
  }

  renderTriangle(context) {
    context.strokeStyle = this.selected ? this.selectedColor : this.color;
    context.lineWidth = 2.0;
    context.lineCap = "round";

    context.beginPath();
    context.moveTo(this.position[0] - 10, this.position[1] + 15);
    context.lineTo(this.position[0] + 10, this.position[1] + 15);

    context.moveTo(this.position[0] + 5, this.position[1] + 15);
    context.lineTo(this.position[0], this.position[1]);
    context.lineTo(this.position[0] - 5, this.position[1] + 15);

    context.stroke();
  }

  renderForce(context) {
    context.strokeStyle = this.selected ? this.selectedColor : this.color;
    context.lineWidth = 2.0;
    context.lineCap = "round";

    var radius = this.moving ? this.motionRadius : this.stillRadius;
    var length = 10 * Math.log(Math.max(this.force, 10.0)) + radius;

    context.beginPath();
    context.moveTo(this.position[0], this.position[1] + length);
    context.lineTo(this.position[0], this.position[1]);

    context.moveTo(this.position[0], this.position[1] + length);
    context.lineTo(this.position[0] - 5, this.position[1] + length - 5);

    context.moveTo(this.position[0], this.position[1] + length);
    context.lineTo(this.position[0] + 5, this.position[1] + length - 5);

    context.stroke();

    context.fillStyle = context.strokeStyle;
    context.textAlign = "center";
    context.fillText(`${+this.force.toFixed(2)}N`, this.position[0],
      this.position[1] + length + 10);
  }

  containPoint(position) {
    var distance = Math.hypot(this.position[0] - position[0],
      this.position[1] - position[1]);

    return distance < (this.stillRadius + 2);
  }
}
