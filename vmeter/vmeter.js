var SerialPortLib = require('../index.js');
var SerialPort = SerialPortLib.SerialPort;

SerialPortLib.list(function (err, ports) {
    var portsPath = document.getElementById("portPath");

    if (err) {
        console.log("Error listing ports", err);
        portsPath.options[0] = new Option(err, "ERROR:" + err);
        portsPath.options[0].selected = true;
        return;
    } else {
        for (var i = 0; i < ports.length; i++) {
            portsPath.options[i] = new Option(ports[i].comName, ports[i].comName);

            if (ports[i].comName.toLowerCase().indexOf("usb") !== -1) {
                portsPath.options[i].selected = true;
            }
        }

        var connectButton = document.getElementById("connect");
        connectButton.onclick = function () {
            var port = portsPath.options[portsPath.selectedIndex].value;
            var baudrateElement = document.getElementById("baudrate");
            var baudrate = baudrateElement.options[baudrateElement.selectedIndex].value;
            connect(port, baudrate);
        };
    }
});


function connect(port, baudrate) {
    var baud = 115200;
    if (baudrate) {
        baud = baudrate;
    }


    var sp = new SerialPort(port, {
        baudrate: baud,
        buffersize: 1
    }, true);

    var output = document.getElementById("output");
    document.getElementById("settings").style.display = "none";



    sp.on("open", function (error) {
        document.getElementById("connected-container").style.display = "block";
        output.textContent += "Connection open\n";

        if (error) {
            console.log('failed to open: ' + error.toString());
        }
    });

    sp.on("error", function (string) {
        output.textContent += "\nError: " + string + "\n";
    });

    // getting string: -55dBm TTL: 09: SEQ: 0017daf8 SRC: ee58 DST: 7fff, MCP_PING 03111111
    var oneline = new Uint8Array(256);
    var lineindex = 0;
    var devices = [];



    function buf2hex(buffer) { // buffer is an ArrayBuffer
                               // create a byte array (Uint8Array) that we can use to read the array buffer
        var byteArray = new Uint8Array(buffer);

        // for each element, we want to get its two-digit hexadecimal representation
        var hexParts = [];
        for(var i = 0; i < byteArray.length; i++) {
            // convert value to hexadecimal
            var hex = byteArray[i].toString(16);

            // pad with zeros to length 2
            var paddedHex = ('00' + hex).slice(-2);

            // push to array
            hexParts.push(paddedHex);
        }

        // join all the hex values of the elements into a single string
        return hexParts.join('');
    }

    // turn an array of uint8 into a number
    function bytevalue( seqbytes ) {
        var val = 0;
        for( var i = seqbytes.length-1; i >= 0; i-- ){
            val = val*16 + seqbytes[i];
        }
        return val;
    }

    function deviceAlreadySeen( device )    {
        var d = devices.find( function (d) {
            return d.src === device.src;
        });
        return d !== undefined;
    }



    // callback fn used
    function sameSource( element, index, array ) {
        return ( element.src === this.src );
    }

    function merge_options(obj1,obj2){
        var obj3 = {};
        for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
        for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
        return obj3;
    }

    function updateExistingDevice( newDevice ) {
        // get index and update the details

        if( devices.find( sameSource, newDevice ) === undefined ) {
            // push returns length
            devices.push( newDevice );
            console.log( "new entry" );

        } else {
            var deviceIndex = -1;
            deviceIndex = devices.findIndex( sameSource, newDevice );
            //console.log( "found at "+deviceIndex );

            var oldDevice = devices[ deviceIndex ];

            try {
                // overwrite with new device information
                if ((newDevice.payload[0] === 130) && (newDevice.payload[1] === 2)) {
                    // second status package
                    oldDevice.curr_time = (newDevice.payload[3] * 256 * 256) + (newDevice.payload[6] * 256) + newDevice.payload[5];
                    oldDevice.fuel = newDevice.payload[7];
                }

                // config package
                if ((newDevice.payload[0] === 23) && (newDevice.payload[1] === 3)) {
                    oldDevice.accu_time = (newDevice.payload[4] * 256 * 256) + (newDevice.payload[7] * 256) + newDevice.payload[6];
                }
            } catch( e ){
                console.log("ignore "+e);
            }
            // update old object with new values
            devices[ deviceIndex ] = merge_options( oldDevice, newDevice );
        }
        devices.sort(function (a, b) { return( a.src < b.src ); });

    }


    sp.on("data", function (data) {

        //console.log("size: " + data.length + " " + data[0] + " " + data[data.length - 1]);

        for( var i = 0; i < data.length; i++ ) {
            oneline[ lineindex ] = data [i];
            lineindex++;

            // check for NL or '}' and end of JSON string
            if(( data[i] === 10 )||( data[i] === 125 )) {
                // end of line
                var parseline = String.fromCharCode.apply( null, oneline );
                parseline = parseline.replace(/\\n/g, "\\n")
                    .replace(/\\'/g, "\\'")
                    //.replace(/\\"/g, '\\"')
                    .replace(/\\&/g, "\\&")
                    .replace(/\\r/g, "\\r")
                    .replace(/\\t/g, "\\t")
                    .replace(/\\b/g, "\\b")
                    .replace(/\\f/g, "\\f");
                // remove non-printable and other non-valid JSON chars
                parseline = parseline.replace(/[\u0000-\u0019]+/g,"");

                // no emply line processing
                if( parseline === "" ) {
                    lineindex = 0;
                    oneline = new Uint8Array(256);
                    continue;
                }


                //console.log( "line: "+ parseline );
                // NL received, process string
                // example: {"sequence":59385,"rssi":-67,"ttl":9,"src":61016,"dest":32767,"product":4185,"payload":[130,1,16,89,22,202,0,13,99,57,22]}

                var meshpkt;
                try {
                    meshpkt = JSON.parse(parseline);
                    //console.log("new: " + JSON.stringify(meshpkt));
                } catch( e ){
                    console.log("parse error "+e);
                    console.log( "line: "+ JSON.stringify( parseline ));
                    // remove old line
                    lineindex = 0;
                    oneline = new Uint8Array(256);
                }

                var inlist = false;
                if(( inlist = deviceAlreadySeen( meshpkt ) )||( meshpkt.product == 4185 )){
                    // put in list, meshpkg.src is the index
                    //console.log( "inlist: "+inlist);
                    updateExistingDevice( meshpkt );
                }

                console.log( "all: "+JSON.stringify( devices ));

                // format for data logging: 2015/03/01,07:01:30,01CP01,2340585,MYNAME99,UNITS
                var now = new Date();

                var device;
                for( var k = 0; k < devices.length; k++ ){

                    device = devices[k];
                    output.textContent = "";
                    if(( device.accu_time !== undefined )&&( device.accu_time !== null )) {
                        //output.textContent
                        output.textContent += now.toISOString() + "," + device.src + "," + device.accu_time + "," + device.curr_time + "," + device.fuel;
                    }
                }

                // start again
                lineindex = 0;
                oneline = new Uint8Array(256);
            }
        }


    });

    function send() {
        var line = input.value;
        input.value = "";
        //sp.writeString(line + "\n");
        sp.close();
    }


    var input = document.getElementById("input");
    var sendButton = document.getElementById("send");
    sendButton.onclick = send;
    input.onkeypress = function (e) {
        if (e.which == 13) {
            send();
        }
    };

}
