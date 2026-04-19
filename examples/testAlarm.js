var SystemArmed = true;
var DoorSensorActive = true;
var WindowSensorActive = true;

if (SystemArmed) {
    if (DoorSensorActive || WindowSensorActive) {
        console.log("Alarm");
    }

}
