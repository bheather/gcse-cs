systemArmed = True
doorSensorActive = True
windowSensorActive = True

if systemArmed:
    if doorSensorActive or windowSensorActive:
        print("Alarm")
        
