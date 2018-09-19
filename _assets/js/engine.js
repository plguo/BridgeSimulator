let renderEngine = (function() {
  let engine = {};

  engine.padding = 10.0;

  engine.requireLogicUpdate = false;
  engine.requireGraphicsUpdate = false;

  engine.fpsMeasurements = 0;
  engine.fpsAverage = 0.0;
  engine.fpsDisplay = 0.0;

  engine.ignoreUpdateRequest = false;

  engine.setup = (canvas, model) => {
    engine.canvas = canvas;
    engine.context = canvas.getContext('2d');
    engine.model = model;

    engine.resize();

    // To avoid zero delta time during the first iteration
    engine.lastTimestamp = performance.now() - 1.0;

    engine.requestUpdate();
    engine.loop();
  };

  var correctCanvasScale = (canvas, context) => {
    var scale = 1;
    if ('devicePixelRatio' in window) {
      if (window.devicePixelRatio > 1) {
        scale = window.devicePixelRatio;
      }
    }

    var canvasWidth = canvas.width;
    var canvasHeight = canvas.height;

    canvas.width = canvasWidth * scale;
    canvas.height = canvasHeight * scale;

    canvas.style.width = canvasWidth + "px";
    canvas.style.height = canvasHeight + "px";

    context.scale(scale, scale);
    return scale;
  };

  engine.resize = () => {
    engine.width = engine.canvas.width;
    engine.height = engine.canvas.height;

    let scale = correctCanvasScale(engine.canvas, engine.context);

    engine.positionRanges = {
      x: [engine.padding, engine.canvas.width - engine.padding],
      y: [engine.padding, engine.canvas.height - engine.padding]
    };

    let centerX = [engine.width / 2.0, 0];
    centerX = engine.translateToCartesianPosition(centerX);
    centerX[0] = Math.round(centerX[0] / 10) * 10;
    engine.mirrorCartesianX = centerX[0];
    centerX = engine.translateFromCartesianPosition(centerX);

    engine.mirrorX = centerX[0];

    engine.requestUpdate();
  };

  engine.requestUpdate = () => {
    if (!engine.ignoreUpdateRequest) {
      engine.requireLogicUpdate = true;
      engine.requireGraphicsUpdate = true;
    }
  };

  engine.loop = (timestamp) => {
    if (engine.requireLogicUpdate) {
      engine.model.update();
      engine.requireLogicUpdate = false;
      engine.requireGraphicsUpdate = true;
    }

    if (engine.requireGraphicsUpdate) {
      engine.render(timestamp);
      engine.requireGraphicsUpdate = false;
    }

    window.requestAnimationFrame(engine.loop);
  };

  engine.render = (timestamp) => {
    let deltaTime = timestamp - engine.lastTimestamp;
    engine.context.clearRect(0, 0, engine.canvas.width, engine.canvas.height);
    engine.renderMirrorLine();

    // engine.renderFPS(deltaTime);

    for (let beam of engine.model.beams) {
      beam.render(engine.context);
    }

    if (engine.model.temporaryBeam) {
      engine.model.temporaryBeam.render(engine.context);
    }

    for (let joint of engine.model.joints) {
      joint.render(engine.context);
    }

    if (engine.model.temporaryJoint) {
      engine.model.temporaryJoint.render(engine.context);
    }

    engine.renderCost();

    engine.lastTimestamp = timestamp;
  }

  engine.renderFPS = (deltaTime) => {
    var fps = 1000.0 / deltaTime;

    engine.context.fillStyle = "black";
    engine.context.textAlign = "start";
    engine.context.textBaseline = "alphabetic";
    engine.context.fillText(`FPS: ${fps}`, 10, 18);
  }

  engine.renderCost = () => {
    engine.context.save();

    engine.context.font = "20px sans-serif";
    engine.context.fillStyle = "black";
    engine.context.textAlign = "start";

    let designLabel
      = ` Length: ${engine.model.totalCost.toFixed(4)} mm`;
    engine.context.fillText(designLabel, 10, 30);

    let evaluatedLabel
      = ` ${engine.model.evaluatedCost.toFixed(4)} g`;
    engine.context.fillText(evaluatedLabel, 10, 64);

    if (engine.model.invalidCostError) {
      engine.context.fillStyle = "red";
    }

    // let evaluatedLabel
    //   = ` Evaluated: $ ${engine.model.evaluatedCost.toFixed(4)}`;
    // engine.context.fillText(evaluatedLabel, 10, 64);

    engine.context.restore();
  }

  engine.renderMirrorLine = () => {
    engine.context.save();

    engine.context.font = "10px sans-serif";
    engine.context.fillStyle = "#999";
    engine.context.textAlign = "center";
    engine.context.fillText(engine.mirrorCartesianX, engine.mirrorX, 15);

    engine.context.setLineDash([5, 50]);
    engine.context.strokeStyle = "#999";
    engine.context.lineWidth = 1;

    engine.context.beginPath();
    engine.context.moveTo(engine.mirrorX, 30);
    engine.context.lineTo(engine.mirrorX, engine.height);
    engine.context.stroke();

    engine.context.restore();
  }

  engine.print = () => {
    var output = "";
    for (let joint of engine.model.joints) {
      let cartesianPosition = engine.translateToCartesianPosition(joint.position);
      cartesianPosition[0] = +cartesianPosition[0].toFixed(4);
      cartesianPosition[1] = +cartesianPosition[1].toFixed(4);

      output += "(" + cartesianPosition.join(", ") + ")\r\n";
    }

    console.log(output);
    window.prompt("Copy to clipboard: Ctrl+C, Enter", output);
  }

  engine.objectAtPosition = (position, exception) => {
    let object = engine.jointAtPosition(position, exception);
    if (!object) {
      object = engine.beamAtPosition(position, exception);
    }

    return object;
  }

  engine.jointAtPosition = (position, exception) => {
    for (let joint of engine.model.joints) {
      if (joint != exception && joint.containPoint(position)) {
        return joint;
      }
    }

    return null;
  }

  engine.beamAtPosition = (position, exception) => {
    for (let beam of engine.model.beams) {
      if (beam != exception && beam.containPoint(position)) {
        return beam;
      }
    }

    return null;
  }

  engine.translateToAbsolutePosition = (position) => {
    var rect = engine.canvas.getBoundingClientRect();
    return [rect.left + position[0], rect.top + position[1]];
  }

  engine.translateToCartesianPosition = (position) => {
    return [
      position[0] / engine.model.pixelToLengthRatio,
      (engine.height - position[1]) / engine.model.pixelToLengthRatio
    ];
  }

  engine.translateFromCartesianPosition = (position) => {
    return [
      position[0] * engine.model.pixelToLengthRatio,
      engine.height - (position[1] * engine.model.pixelToLengthRatio)
    ];
  }

  engine.clipPosition = (position) => {
    var x = Math.min(Math.max(position[0], engine.positionRanges.x[0]),
      engine.positionRanges.x[1]);
    var y = Math.min(Math.max(position[1], engine.positionRanges.y[0]),
      engine.positionRanges.y[1]);
    return [x, y];
  }

  return engine;
})();
