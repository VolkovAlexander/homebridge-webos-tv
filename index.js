const lgtv2 = require('lgtv2');
const wol = require('wake_on_lan');
const tcpp = require('tcp-ping');
const mqtt = require("mqtt");

let lgtv, Service, Characteristic;
var tvVolume = 0;
var tvChannel = 0;
var newTvChannel = 0;
var changeTvChannelInProgress = false;
var tvMuted = false;

// note to myself: 
// - keep track of the power status in a variable? Could improve power status, especially for oled tvs, set power state true on connect subscribe, set power state to false on close subscribe?
// - add setPowerStateManually function? To set the homekit switch status to disabled when the user turns off the TV with the remote. Can be done on the close subscribe?


module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory('homebridge-webos-tv-volandkb', 'webostv-private', webosTvAccessory);
};

function mqttInit(config) {
    var clientId = 'mqttthing_' + config.name.replace(/[^\x20-\x7F]/g, "") + '_' + Math.random().toString(16).substr(2, 8);

    // start with any configured options object
    var options = config.mqttOptions || {};

    // standard options set by mqtt-thing
    var myOptions = {
        keepalive: 10,
        clientId: clientId,
        protocolId: 'MQTT',
        protocolVersion: 4,
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 30 * 1000,
        will: {
            topic: 'WillMsg',
            payload: 'Connection Closed abnormally..!',
            qos: 0,
            retain: false
        },
        username: config.username,
        password: config.password,
        rejectUnauthorized: false
    };

    // copy standard options into options unless already set by user
    for (var opt in myOptions) {
        if (myOptions.hasOwnProperty(opt) && !options.hasOwnProperty(opt)) {
            options[opt] = myOptions[opt];
        }
    }

    // create MQTT client
    return mqtt.connect(config.url, options);
}

function mqttPublish(client, topic, message) {
    if (typeof topic != 'string') {
        var extendedTopic = topic;
        topic = extendedTopic['topic'];
        if (extendedTopic.hasOwnProperty('apply')) {
            var applyFn = Function("message", extendedTopic['apply']);
            message = applyFn(message);
        }
    }

    client.publish(topic, message.toString());
}

// MAIN SETUP
function webosTvAccessory(log, config, api) {
    this.mqttClient = mqttInit(config);
    this.topics = config.topics;
    this.channelsToIds = [
        "",
        '3_27_1_1_7114_2_1',
        '3_27_2_2_7114_3_1',
        '3_27_3_3_7114_4_1',
        '3_27_4_4_7114_7_1',
        '3_27_5_5_7114_8_1',
        '3_27_6_6_7114_6_1',
        '3_27_7_7_7114_5_1',
        '3_27_8_8_7114_139_1',
        '3_27_9_9_7114_1_1',
        '3_27_10_10_7114_15_1',
        '3_28_11_11_7115_16_1',
        '3_28_12_12_7115_14_1',
        '3_28_13_13_7115_12_1',
        '3_28_14_14_7115_17_1',
        '3_28_15_15_7115_10_1',
        '3_28_16_16_7115_11_1',
        '3_28_17_17_7115_90_1',
        '3_28_18_18_7115_13_1',
        '3_28_19_0_7115_18_1',
        '3_28_20_0_7115_9_1',
        '3_42_21_21_7021_172_1',
        '3_32_22_22_7119_89_1',
        '3_44_23_23_7068_93_1',
        '3_29_24_24_7116_95_1',
        '3_32_25_25_7119_128_1',
        '3_62_26_26_7028_173_1',
        '3_48_27_27_7024_51_1',
        "",
        "",
        '3_42_30_30_7021_80_1',
        '3_42_31_31_7021_79_1',
        '3_41_32_32_7139_70_1',
        '3_43_33_33_7023_81_1',
        '3_48_34_34_7024_131_1',
        '3_33_35_35_7030_197_1',
        '3_43_36_36_7023_82_1',
        '3_45_37_37_7069_130_1',
        "",
        '3_40_39_39_7138_66_1',
        '3_56_40_40_7036_147_1',
        '3_52_41_41_7027_167_1',
        '3_50_42_42_7025_149_1',
        '3_39_43_43_7137_113_1',
        '3_44_44_44_7068_108_1',
        '3_40_45_45_7138_185_1',
        '3_50_46_46_7025_148_1',
        '3_50_47_47_7025_153_1',
        '3_29_48_48_7116_19_1',
        '3_30_49_49_7117_83_1',
        '3_30_50_50_7117_104_1',
        '3_40_51_51_7138_48_1',
        '3_50_52_52_7025_154_1',
        '3_56_53_53_7036_22_1',
        '3_51_54_54_7026_156_1',
        '3_51_55_55_7026_155_1',
        '3_29_56_56_7116_176_1',
        '3_46_57_57_7033_114_1',
        '3_41_58_58_7139_69_1',
        '3_46_59_59_7033_112_1',
        '3_46_60_60_7033_115_1',
        '3_32_61_61_7119_53_1',
        '3_62_62_62_7028_140_1',
        '3_51_63_63_7026_157_1',
        '3_46_64_64_7033_111_1',
        '3_48_65_65_7024_141_1',
        '3_64_66_66_7029_194_1',
        '3_51_67_67_7026_159_1',
        '3_39_68_68_7137_37_1',
        '3_46_69_69_7033_109_1',
        '3_32_70_70_7119_55_1',
        '3_41_71_71_7139_71_1',
        '3_30_72_72_7117_36_1',
        '3_50_73_73_7025_143_1',
        '3_51_74_74_7026_166_1',
        '3_52_75_75_7027_180_1',
        '3_38_76_76_7031_94_1',
        '3_48_77_77_7024_132_1',
        '3_50_78_78_7025_135_1',
        '3_50_79_79_7025_45_1',
        '3_33_80_80_7030_196_1',
        '3_56_81_81_7036_142_1',
        '3_47_82_82_7035_192_1',
        '3_50_83_83_7025_144_1',
        '3_50_84_84_7025_151_1',
        '3_30_85_85_7117_33_1',
        '3_50_86_86_7025_145_1',
        '3_30_87_87_7117_34_1',
        '3_41_88_88_7139_74_1',
        '3_30_89_89_7117_30_1',
        "",
        '3_45_91_91_7069_60_1',
        '3_52_92_92_7027_179_1',
        '3_38_93_93_7031_182_1',
        '3_47_94_94_7035_61_1',
        "",
        "",
        '3_44_97_97_7068_59_1',
        "",
        ""
    ];

    this.newTvChannel = 0;
    this.log = log;
    this.ip = config['ip'];
    this.name = config['name'];
    this.mac = config['mac'];
    this.keyFile = config['keyFile'];
    this.volumeControl = config['volumeControl'];
    if (this.volumeControl == undefined) {
        this.volumeControl = true;
    }
    this.volumeLimit = config['volumeLimit'];
    if (this.volumeLimit == undefined || isNaN(this.volumeLimit) || this.volumeLimit < 0) {
        this.volumeLimit = 100;
    }
    this.channelControl = config['channelControl'];
    if (this.channelControl == undefined) {
        this.channelControl = true;
    }
    this.mediaControl = config['mediaControl'];
    if (this.mediaControl == undefined) {
        this.mediaControl = true;
    }
    this.pollingEnabled = config['pollingEnabled'];
    if (this.pollingEnabled == undefined) {
        this.pollingEnabled = false;
    }
    this.alivePollingInterval = config['pollingInterval'] || 5;
    this.alivePollingInterval = this.alivePollingInterval * 1000;
    this.appSwitch = config['appSwitch'];

    this.url = 'ws://' + this.ip + ':3000';
    this.enabledServices = [];
    this.connected = false;
    this.checkCount = 0;
    this.checkAliveInterval = null;

    this.lgtv = new lgtv2({
        url: this.url,
        timeout: 1000,
        reconnect: 500,
        keyFile: this.keyFile
    });

    this.lgtv.on('connect', () => {
        this.log.info('webOS - connected to TV');
        this.connected = true;
        if (!this.checkAliveInterval && this.pollingEnabled) {
            this.checkAliveInterval = setInterval(this.checkTVState.bind(this, this.pollCallback.bind(this)), this.alivePollingInterval);
        }
        this.log.debug('webOS - subscribing to TV services');
        this.lgtv.subscribe('ssap://com.webos.applicationManager/getForegroundAppInfo', (err, res) => {
            if (!res || err) {
                this.log.error('webOS - TV app check - error while getting current app');
            } else {
                if (res.appId) {
                    this.log.info('webOS - app launched, current appId: %s', res.appId);
                }
            }
        });
        this.lgtv.subscribe('ssap://audio/getStatus', (err, res) => {
            if (!res || err) {
                this.log.error('webOS - TV audio status - error while getting current audio status');
            } else {
                this.log.info('webOS - audio status changed');

                // volume state
                this.tvVolume = res.volume;
                this.setVolumeManually(null, this.tvVolume);
                this.log.info('webOS - current volume: %s', res.volume);

                // mute state
                this.tvMuted = res.mute;
                this.setMuteStateManually(null, !this.tvMuted);
                this.log.info('webOS - muted: %s', res.mute ? "Yes" : "No");
            }
        });
        this.lgtv.subscribe('ssap://tv/getCurrentChannel', (err, res) => {
            if (!res || err) {
                this.log.error('webOS - TV channel status - error while getting current channel status');
            } else {
                this.log.info('webOS - channel status changed');

                this.tvChannel = parseInt(res.channelNumber);
                this.setChannelManually(null, this.tvChannel);
                this.log.info('webOS - current channel: %s', res.channelId);
                this.channelsToIds[res.channelNumber] = res.channelId;
            }
        });
        this.updateAccessoryStatus();
    });

    this.lgtv.on('close', () => {
        this.log.info('webOS - disconnected from TV');
        this.connected = false;
        //if(this.checkAliveInterval) {
        //  clearInterval(this.checkAliveInterval);
        //  this.checkAliveInterval = undefined;
        //}
    });

    this.lgtv.on('error', (error) => {
        this.log.error('webOS - %s', error);
        //this.connected = false;
        //setTimeout(this.lgtv.connect(this.url), 5000);
    });

    this.lgtv.on('prompt', () => {
        this.log.info('webOS - prompt for confirmation');
        this.connected = false;
    });

    this.lgtv.on('connecting', () => {
        this.log.debug('webOS - connecting to TV');
        this.connected = false;
    });

    this.informationService = new Service.AccessoryInformation();

    this.informationService
        .setCharacteristic(Characteristic.Manufacturer, 'LG Electronics Inc.')
        .setCharacteristic(Characteristic.Model, 'webOS TV')
        .setCharacteristic(Characteristic.SerialNumber, '-')
        .setCharacteristic(Characteristic.FirmwareRevision, '1.1.0');


    this.enabledServices.push(this.informationService);

    this.prepareVolumeService();
    this.prepareAppSwitchService();
    this.prepareChannelService();
    this.prepareMediaControlService();
}

// SETUP COMPLEX SERVICES

webosTvAccessory.prototype.prepareVolumeService = function () {

    if (!this.volumeControl) {
        return;
    }

    if (this.volumeControl == true) {
        this.volumeService = new Service.Lightbulb(this.name, "volumeService");

        this.volumeService
            .getCharacteristic(Characteristic.On)
            .on('get', this.getState.bind(this))
            .on('set', this.setState.bind(this));

        this.volumeService
            .addCharacteristic(new Characteristic.Brightness())
            .on('get', this.getVolume.bind(this))
            .on('set', this.setVolume.bind(this));

        this.enabledServices.push(this.volumeService);
    }
};

webosTvAccessory.prototype.prepareAppSwitchService = function () {

    if (this.appSwitch == undefined || this.appSwitch == null || this.appSwitch.length <= 0) {
        return;
    }

    let isArray = Array.isArray(this.appSwitch);

    if (isArray) {
        this.appSwitchService = new Array();
        this.appSwitch.forEach((value, i) => {
            this.appSwitch[i] = this.appSwitch[i].replace(/\s/g, '');
            this.appSwitchService[i] = new Service.Switch(this.name + " App: " + value, "appSwitchService" + i);
        });
    } else {
        this.appSwitchService = new Service.Switch(this.name + " App: " + this.appSwitch, "appSwitchService");
    }

    if (isArray) {
        this.appSwitch.forEach((value, i) => {
            this.appSwitchService[i]
                .getCharacteristic(Characteristic.On)
                .on('get', (callback) => {
                    this.getAppSwitchState(callback, this.appSwitch[i]);
                })
                .on('set', (state, callback) => {
                    this.setAppSwitchState(state, callback, this.appSwitch[i]);
                });
        });
    } else {
        this.appSwitchService
            .getCharacteristic(Characteristic.On)
            .on('get', (callback) => {
                this.getAppSwitchState(callback, this.appSwitch);
            })
            .on('set', (state, callback) => {
                this.setAppSwitchState(state, callback, this.appSwitch);
            });
    }

    if (isArray) {
        this.appSwitch.forEach((value, i) => {
            this.enabledServices.push(this.appSwitchService[i]);
        });
    } else {
        this.enabledServices.push(this.appSwitchService);
    }

};

webosTvAccessory.prototype.prepareChannelService = function () {

    if (!this.channelControl) {
        return;
    }

    if (this.channelControl == true) {
        this.channelService = new Service.Lightbulb(this.name + " Channels", "channelService");

        this.channelService
            .addCharacteristic(new Characteristic.Brightness())
            .on('get', this.getChannel.bind(this))
            .on('set', this.setChannel.bind(this));

        this.enabledServices.push(this.channelService);
    }
};

webosTvAccessory.prototype.prepareMediaControlService = function () {

    if (!this.mediaControl) {
        return;
    }

    this.mediaPlayService = new Service.Switch(this.name + " Play", "mediaPlayService");

    this.mediaPlayService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getMediaControlSwitch.bind(this))
        .on('set', (state, callback) => {
            this.setMediaControlSwitch(state, callback, "play");
        });

    this.enabledServices.push(this.mediaPlayService);

    this.mediaPauseService = new Service.Switch(this.name + " Pause", "mediaPauseService");

    this.mediaPauseService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getMediaControlSwitch.bind(this))
        .on('set', (state, callback) => {
            this.setMediaControlSwitch(state, callback, "pause");
        });

    this.enabledServices.push(this.mediaPauseService);

    this.mediaStopService = new Service.Switch(this.name + " Stop", "mediaStopService");

    this.mediaStopService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getMediaControlSwitch.bind(this))
        .on('set', (state, callback) => {
            this.setMediaControlSwitch(state, callback, "stop");
        });

    this.enabledServices.push(this.mediaStopService);

    this.mediaRewindService = new Service.Switch(this.name + " Rewind", "mediaRewindService");

    this.mediaRewindService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getMediaControlSwitch.bind(this))
        .on('set', (state, callback) => {
            this.setMediaControlSwitch(state, callback, "rewind");
        });

    this.enabledServices.push(this.mediaRewindService);

    this.mediaFastForwardService = new Service.Switch(this.name + " Fast Forward", "mediaFastForwardService");

    this.mediaFastForwardService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getMediaControlSwitch.bind(this))
        .on('set', (state, callback) => {
            this.setMediaControlSwitch(state, callback, "fastForward");
        });

    this.enabledServices.push(this.mediaFastForwardService);

};

// HELPER METHODS
webosTvAccessory.prototype.setMuteStateManually = function (error, value) {
    if (this.volumeService) this.volumeService.getCharacteristic(Characteristic.On).updateValue(value);
};

webosTvAccessory.prototype.setVolumeManually = function (error, value) {
    if (this.volumeService) this.volumeService.getCharacteristic(Characteristic.Brightness).updateValue(value);
};

webosTvAccessory.prototype.setChannelManually = function (error, value) {
    if (this.channelService && !this.changeTvChannelInProgress) this.channelService.getCharacteristic(Characteristic.Brightness).updateValue(value);
};

webosTvAccessory.prototype.setAppSwitchManually = function (error, value, appId) {
    if (this.appSwitchService) {
        if (Array.isArray(this.appSwitch)) {
            if (appId == undefined || appId == null || appId.length <= 0) {
                this.appSwitch.forEach((value, i) => {
                    this.appSwitchService[i].getCharacteristic(Characteristic.On).updateValue(value);
                });
            } else {
                this.appSwitch.forEach((tmpVal, i) => {
                    if (appId === tmpVal) {
                        this.appSwitchService[i].getCharacteristic(Characteristic.On).updateValue(value);
                    } else {
                        this.appSwitchService[i].getCharacteristic(Characteristic.On).updateValue(false);
                    }
                });
            }
        } else {
            this.appSwitchService.getCharacteristic(Characteristic.On).updateValue(value);
        }
    }
};

webosTvAccessory.prototype.updateAccessoryStatus = function () {
    if (this.appSwitchService) this.checkForegroundApp(this.setAppSwitchManually.bind(this));
};

webosTvAccessory.prototype.pollCallback = function (error, status) {
    if (!status) {
        this.volumeService.getCharacteristic(Characteristic.On).updateValue(status);
    } else {
        this.volumeService.getCharacteristic(Characteristic.On).updateValue(status);
    }
};

webosTvAccessory.prototype.powerOnTvWithCallback = function (callback) {
    wol.wake(this.mac, (error) => {
        if (error) {
            this.log.info('webOS - wake on lan error');
            return;
        }
        let x = 0;
        let appLaunchInterval = setInterval(() => {
            if (this.connected) {
                setTimeout(callback.bind(this), 1000);
                clearInterval(appLaunchInterval);
                return;
            }

            this.lgtv.connect(this.url);

            if (x++ === 7) {
                clearInterval(appLaunchInterval);
                return;
            }
        }, 2000);
    });
};

webosTvAccessory.prototype.checkTVState = function (callback) {
    /*
    tcpp.probe(this.ip, 3000, (err, isAlive) => {
        if (!isAlive) {
            this.connected = false;
        } else {
            this.connected = true;
        }
        this.log.debug('webOS - TV state: %s', this.connected ? "On" : "Off");
    });
    */
    callback(null, this.connected);
};

webosTvAccessory.prototype.checkForegroundApp = function (callback, appId) {
    if (this.connected) {
        this.lgtv.request('ssap://com.webos.applicationManager/getForegroundAppInfo', (err, res) => {
            if (!res || err) {
                callback(new Error('webOS - current app - error while getting current app info'));
            } else {
                this.log.debug('webOS - TV current appId: %s', res.appId);
                if (appId == undefined || appId == null) { // if appId undefined or null then i am checking which app is currently running; if set then continue normally
                    callback(null, true, res.appId);
                } else if (res.appId === appId) {
                    callback(null, true, appId);
                } else {
                    callback(null, false, appId);
                }
            }
        });
    } else {
        callback(null, false);
    }
};

webosTvAccessory.prototype.checkWakeOnLan = function (callback) {
    if (this.connected) {
        this.checkCount = 0;
        this.lgtv.connect(this.url);
        callback(null, true);
    } else {
        if (this.checkCount < 3) {
            this.checkCount++;
            this.lgtv.connect(this.url);
            this.log.info('webOS - try to reconnect');
            setTimeout(this.checkWakeOnLan.bind(this, callback), 5000);
        } else {
            this.checkCount = 0;
            callback(new Error('webOS - wake timeout'));
        }
    }
};

// HOMEBRIDGE STATE SETTERS/GETTERS
webosTvAccessory.prototype.getState = function (callback) {
    //this.lgtv.connect(this.url);
};

webosTvAccessory.prototype.setState = function (state, callback) {
    if (state) {
        if (!this.connected) {
            mqttPublish(this.mqttClient, this.topics.setOn, 0);
            mqttPublish(this.mqttClient, this.topics.setOn, 1);
        } else {
            callback();
        }
    } else {
        if (this.connected) {
            this.lgtv.request('ssap://system/turnOff', (err, res) => {
                if (err) return callback(new Error('webOS - error turning off the TV'));
                this.lgtv.disconnect();
                this.connected = false;
                this.setAppSwitchManually(null, false, null);
                this.setMuteStateManually(null, false);
                callback();
            })
        } else {
            callback();
        }
    }
};


webosTvAccessory.prototype.getMuteState = function (callback) {
    if (this.connected) {
        callback(null, !this.tvMuted);
    } else {
        callback(null, false);
    }
};

webosTvAccessory.prototype.setMuteState = function (state, callback) {
    if (this.connected) {
        this.lgtv.request('ssap://audio/setMute', {
            mute: !state
        });
        callback();
    } else {
        callback(); // respond with success when tv is off
        // callback(new Error('webOS - is not connected, cannot set mute state'));
    }
};


webosTvAccessory.prototype.getVolume = function (callback) {
    if (this.connected) {
        callback(null, this.tvVolume);
    } else {
        callback(null, 0);
    }
};

webosTvAccessory.prototype.setVolume = function (level, callback) {
    if (this.connected) {
        if (level > this.volumeLimit) {
            level = this.volumeLimit;
        }
        this.lgtv.request('ssap://audio/setVolume', {
            volume: level
        });
        callback();
    } else {
        callback(new Error('webOS - is not connected, cannot set volume'));
    }
};

webosTvAccessory.prototype.getChannelSwitch = function(callback) {
    this.channelService.getCharacteristic(Characteristic.On).updateValue(false);
};

webosTvAccessory.prototype.setChannelSwitch = function(state, callback, isUp) {
    if (this.connected) {
        this.lgtv.request('ssap://tv/channelUp');
        setTimeout(() => {
            this.channelService.getCharacteristic(Characteristic.On).updateValue(false);
            callback();
        }, 10);
    } else {
        callback(new Error('webOS - is not connected, cannot change channel'));
    }
};

webosTvAccessory.prototype.getChannel = function (callback) {
    if (this.connected) {
        callback(null, this.tvChannel);
    } else {
        callback(null, 0);
    }
};

webosTvAccessory.prototype.setChannel = function (level, callback) {
    if (this.connected) {

        this.newTvChannel = parseInt(level);

        setTimeout(() => {
            if(typeof this.channelsToIds[this.newTvChannel] !== 'undefined') {
                this.lgtv.request('ssap://tv/openChannel', {
                    channelId: this.channelsToIds[this.newTvChannel]
                });
            }
        }, 2000);

        callback();
    } else {
        callback(new Error('webOS - is not connected, cannot set channel'));
    }
};

webosTvAccessory.prototype.getVolumeSwitch = function (callback) {
    callback(null, false);
};

webosTvAccessory.prototype.setVolumeSwitch = function (state, callback, isUp) {
    if (this.connected) {
        let volLevel = this.tvVolume;
        if (isUp) {
            if (volLevel < this.volumeLimit) {
                this.lgtv.request('ssap://audio/volumeUp');
            }
        } else {
            this.lgtv.request('ssap://audio/volumeDown');
        }
        setTimeout(() => {
            this.volumeUpService.getCharacteristic(Characteristic.On).updateValue(false);
            this.volumeDownService.getCharacteristic(Characteristic.On).updateValue(false);
        }, 10);
        callback();
    } else {
        callback(new Error('webOS - is not connected, cannot set volume'));
    }
};

webosTvAccessory.prototype.getAppSwitchState = function (callback, appId) {
    if (!this.connected) {
        callback(null, false);
    } else {
        setTimeout(this.checkForegroundApp.bind(this, callback, appId), 50);
    }
};

webosTvAccessory.prototype.setAppSwitchState = function (state, callback, appId) {
    if (this.connected) {
        if (state) {
            this.lgtv.request('ssap://system.launcher/launch', {
                id: appId
            });
            this.setAppSwitchManually(null, true, appId);
        } else {
            this.lgtv.request('ssap://system.launcher/launch', {
                id: "com.webos.app.livetv"
            });
        }
        callback();
    } else {

        if (state) {
            this.log.info('webOS - Trying to launch %s but TV is off, attempting to power on the TV', appId);
            this.powerOnTvWithCallback(() => {
                this.lgtv.request('ssap://system.launcher/launch', {
                    id: appId
                });
                callback();
            });
        }
    }
};

webosTvAccessory.prototype.getMediaControlSwitch = function (callback) {
    callback(null, false);
};

webosTvAccessory.prototype.setMediaControlSwitch = function (state, callback, action) {
    if (this.connected) {
        if (action === "play") {
            this.lgtv.request('ssap://media.controls/play');
        } else if (action === "pause") {
            this.lgtv.request('ssap://media.controls/pause');
        } else if (action === "stop") {
            this.lgtv.request('ssap://media.controls/stop');
        } else if (action === "rewind") {
            this.lgtv.request('ssap://media.controls/rewind');
        } else if (action === "fastForward") {
            this.lgtv.request('ssap://media.controls/fastForward');
        }
        setTimeout(() => {
            this.mediaPlayService.getCharacteristic(Characteristic.On).updateValue(false);
            this.mediaPauseService.getCharacteristic(Characteristic.On).updateValue(false);
            this.mediaStopService.getCharacteristic(Characteristic.On).updateValue(false);
            this.mediaRewindService.getCharacteristic(Characteristic.On).updateValue(false);
            this.mediaFastForwardService.getCharacteristic(Characteristic.On).updateValue(false);
        }, 10);
        callback();
    } else {
        callback(new Error('webOS - is not connected, cannot control media'));
    }
};

webosTvAccessory.prototype.getServices = function () {
    return this.enabledServices;
};

