let touchController = (function() {
  let controller = {};

  controller.setup = (canvas) => {
    canvas.addEventListener('mousedown', mouseDown);
    canvas.addEventListener('mousemove', mouseMove);
    canvas.addEventListener('mouseup', mouseUp);
    canvas.addEventListener('mouseleave', mouseUp);

    canvas.addEventListener('touchstart', mouseDown);
    canvas.addEventListener('touchmove', mouseMove);
    canvas.addEventListener('touchend', mouseUp);
    canvas.addEventListener('touchcancel', mouseUp);

    controller.canvas = canvas;
  };

  // To be overrided
  controller.objectAtPosition = (position) => { return null; };
  controller.updateLocation = (object, position) => {};
  controller.clicked = (object, position) => {};
  controller.dragEnded = (object, position) => {};

  controller.mouseDownInside = false;
  controller.previousPosition = [NaN, NaN];

  var translateFromMousePosition = (event) => {
    var rect = controller.canvas.getBoundingClientRect();
    var position;

    if (event.touches !== undefined && event.touches.length !== 0) {
        position = [event.touches[0].clientX - rect.left - 3,
                    event.touches[0].clientY - rect.top - 3];
    } else {
        position = [event.clientX - rect.left - 3,
                    event.clientY - rect.top - 3];
    }

    if (isNaN(position[0]) || isNaN(position[1])) {
        return controller.previousPosition;
    }

    controller.previousPosition = position;
    return position;
  }

  var mouseDown = (event) => {
     console.log("mouseDown");

    controller.shiftKey = event.shiftKey;

    let position = translateFromMousePosition(event);

    controller.trackingObject = controller.objectAtPosition(position);
    if (controller.trackingObject) {
      controller.lastClicked = controller.trackingObject;
    }

    controller.mouseDownTimestamp = performance.now();
    controller.mouseDownPosition = position;

    controller.dragging = false;
    controller.mouseDownInside = true;

    event.preventDefault();
  };

  var mouseMove = (event) => {
       console.log("mouseMove");
    if (!controller.mouseDownInside) {
      return;
    }

    let position = translateFromMousePosition(event);

    if (controller.dragging) {
      controller.updateLocation(controller.trackingObject, position);
    } else {
      let deltaTime = performance.now() - controller.mouseDownTimestamp;
      let deltaDistance = Math.hypot(
        controller.mouseDownPosition[0] - position[0],
        controller.mouseDownPosition[1] - position[1]
      );

      if (deltaDistance > 5.0 || deltaTime > 300) {
        controller.dragging =
          controller.updateLocation(controller.trackingObject, position);
      }
    }

    event.preventDefault();
  };

  var mouseUp = (event) => {

    if (!controller.mouseDownInside) {
      return;
    }

    let position = translateFromMousePosition(event);

    if (controller.dragging) {
         console.log("dragEnded");
      controller.dragEnded(controller.trackingObject, position);
    } else {
         console.log("clicked", position);
      controller.clicked(controller.trackingObject, position);
    }

    controller.trackingObject = null;
    controller.mouseDownInside = false;

    event.preventDefault();
  };

  return controller;
})();
