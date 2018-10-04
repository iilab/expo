// @flow

import { NativeModules } from 'react-native';

import {
  _DEFAULT_PROGRESS_UPDATE_INTERVAL_MILLIS,
  type PlaybackStatus,
  type PlaybackStatusToSet,
} from '../AV';

import { _isAudioEnabled, _throwIfAudioIsDisabled } from '../Audio';

import { Sound } from './Sound';

export type RecordingOptions = {
  android: {
    extension: string,
    outputFormat: number,
    audioEncoder: number,
    sampleRate?: number,
    numberOfChannels?: number,
    bitRate?: number,
    maxFileSize?: number,
  },
  ios: {
    extension: string,
    outputFormat?: string | number,
    audioQuality: number,
    sampleRate: number,
    numberOfChannels: number,
    bitRate: number,
    bitRateStrategy?: number,
    bitDepthHint?: number,
    linearPCMBitDepth?: number,
    linearPCMIsBigEndian?: boolean,
    linearPCMIsFloat?: boolean,
  },
};

export const RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_DEFAULT = 0;
export const RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_THREE_GPP = 1;
export const RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4 = 2;
export const RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_AMR_NB = 3;
export const RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_AMR_WB = 4;
export const RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_AAC_ADIF = 5;
export const RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_AAC_ADTS = 6;
export const RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_RTP_AVP = 7;
export const RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG2TS = 8;
export const RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_WEBM = 9;

export const RECORDING_OPTION_ANDROID_AUDIO_ENCODER_DEFAULT = 0;
export const RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AMR_NB = 1;
export const RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AMR_WB = 2;
export const RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC = 3;
export const RECORDING_OPTION_ANDROID_AUDIO_ENCODER_HE_AAC = 4;
export const RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC_ELD = 5;

export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM = 'lpcm';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_AC3 = 'ac-3';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_60958AC3 = 'cac3';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_APPLEIMA4 = 'ima4';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC = 'aac ';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4CELP = 'celp';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4HVXC = 'hvxc';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4TWINVQ = 'twvq';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_MACE3 = 'MAC3';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_MACE6 = 'MAC6';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_ULAW = 'ulaw';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_ALAW = 'alaw';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_QDESIGN = 'QDMC';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_QDESIGN2 = 'QDM2';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_QUALCOMM = 'Qclp';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEGLAYER1 = '.mp1';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEGLAYER2 = '.mp2';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEGLAYER3 = '.mp3';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_APPLELOSSLESS = 'alac';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC_HE = 'aach';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC_LD = 'aacl';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC_ELD = 'aace';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC_ELD_SBR = 'aacf';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC_ELD_V2 = 'aacg';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC_HE_V2 = 'aacp';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC_SPATIAL = 'aacs';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_AMR = 'samr';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_AMR_WB = 'sawb';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_AUDIBLE = 'AUDB';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_ILBC = 'ilbc';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_DVIINTELIMA = 0x6d730011;
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_MICROSOFTGSM = 0x6d730031;
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_AES3 = 'aes3';
export const RECORDING_OPTION_IOS_OUTPUT_FORMAT_ENHANCEDAC3 = 'ec-3';

export const RECORDING_OPTION_IOS_AUDIO_QUALITY_MIN = 0;
export const RECORDING_OPTION_IOS_AUDIO_QUALITY_LOW = 0x20;
export const RECORDING_OPTION_IOS_AUDIO_QUALITY_MEDIUM = 0x40;
export const RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH = 0x60;
export const RECORDING_OPTION_IOS_AUDIO_QUALITY_MAX = 0x7f;

export const RECORDING_OPTION_IOS_BIT_RATE_STRATEGY_CONSTANT = 0;
export const RECORDING_OPTION_IOS_BIT_RATE_STRATEGY_LONG_TERM_AVERAGE = 1;
export const RECORDING_OPTION_IOS_BIT_RATE_STRATEGY_VARIABLE_CONSTRAINED = 2;
export const RECORDING_OPTION_IOS_BIT_RATE_STRATEGY_VARIABLE = 3;

// TODO : maybe make presets for music and speech, or lossy / lossless.

export const RECORDING_OPTIONS_PRESET_HIGH_QUALITY: RecordingOptions = {
  android: {
    extension: '.m4a',
    outputFormat: RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
    audioEncoder: RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
  },
  ios: {
    extension: '.caf',
    audioQuality: RECORDING_OPTION_IOS_AUDIO_QUALITY_MAX,
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
};

export const RECORDING_OPTIONS_PRESET_LOW_QUALITY: RecordingOptions = {
  android: {
    extension: '.3gp',
    outputFormat: RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_THREE_GPP,
    audioEncoder: RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AMR_NB,
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
  },
  ios: {
    extension: '.caf',
    audioQuality: RECORDING_OPTION_IOS_AUDIO_QUALITY_MIN,
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
};

// TODO For consistency with PlaybackStatus, should we include progressUpdateIntervalMillis here as well?
export type RecordingStatus =
  | {
      canRecord: false,
      isDoneRecording: false,
    }
  | {
      canRecord: true,
      isRecording: boolean,
      durationMillis: number,
    }
  | {
      canRecord: false,
      isDoneRecording: true,
      durationMillis: number,
    };

let _recorderExists: boolean = false;

export class Recording {
  _canRecord: boolean;
  _isDoneRecording: boolean;
  _finalDurationMillis: number;
  _uri: ?string;
  _onRecordingStatusUpdate: ?(status: RecordingStatus) => void;
  _progressUpdateTimeoutVariable: ?TimeoutID;
  _progressUpdateIntervalMillis: number;
  _options: ?RecordingOptions;

  constructor() {
    this._canRecord = false;
    this._isDoneRecording = false;
    this._finalDurationMillis = 0;
    this._uri = null;
    this._progressUpdateTimeoutVariable = null;
    this._progressUpdateIntervalMillis = _DEFAULT_PROGRESS_UPDATE_INTERVAL_MILLIS;
    this._options = null;
  }

  // Internal methods

  _cleanupForUnloadedRecorder = async (finalStatus: RecordingStatus) => {
    this._canRecord = false;
    this._isDoneRecording = true;
    // $FlowFixMe(greg): durationMillis is not always defined
    this._finalDurationMillis = finalStatus.durationMillis;
    _recorderExists = false;
    if (NativeModules.ExponentAV.setUnloadedCallbackForAndroidRecording) {
      NativeModules.ExponentAV.setUnloadedCallbackForAndroidRecording(null);
    }
    this._disablePolling();
    return await this.getStatusAsync(); // Automatically calls onRecordingStatusUpdate for the final state.
  };

  _pollingLoop = async () => {
    if (_isAudioEnabled() && this._canRecord && this._onRecordingStatusUpdate != null) {
      this._progressUpdateTimeoutVariable = setTimeout(
        this._pollingLoop,
        this._progressUpdateIntervalMillis
      );
      try {
        await this.getStatusAsync();
      } catch (error) {
        this._disablePolling();
      }
    }
  };

  _disablePolling() {
    if (this._progressUpdateTimeoutVariable != null) {
      clearTimeout(this._progressUpdateTimeoutVariable);
      this._progressUpdateTimeoutVariable = null;
    }
  }

  _enablePollingIfNecessaryAndPossible() {
    if (_isAudioEnabled() && this._canRecord && this._onRecordingStatusUpdate != null) {
      this._disablePolling();
      this._pollingLoop();
    }
  }

  _callOnRecordingStatusUpdateForNewStatus(status: RecordingStatus) {
    if (this._onRecordingStatusUpdate != null) {
      this._onRecordingStatusUpdate(status);
    }
  }

  async _performOperationAndHandleStatusAsync(
    operation: () => Promise<RecordingStatus>
  ): Promise<RecordingStatus> {
    _throwIfAudioIsDisabled();
    if (this._canRecord) {
      const status = await operation();
      this._callOnRecordingStatusUpdateForNewStatus(status);
      return status;
    } else {
      throw new Error('Cannot complete operation because this recorder is not ready to record.');
    }
  }

  // Note that all calls automatically call onRecordingStatusUpdate as a side effect.

  // Get status API

  getStatusAsync = async (): Promise<RecordingStatus> => {
    // Automatically calls onRecordingStatusUpdate.
    if (this._canRecord) {
      return this._performOperationAndHandleStatusAsync(() =>
        NativeModules.ExponentAV.getAudioRecordingStatus()
      );
    }
    const status: RecordingStatus = this._isDoneRecording
      ? {
          canRecord: false,
          isDoneRecording: true,
          durationMillis: this._finalDurationMillis,
        }
      : {
          canRecord: false,
          isDoneRecording: false,
        };
    this._callOnRecordingStatusUpdateForNewStatus(status);
    return status;
  };

  setOnRecordingStatusUpdate(onRecordingStatusUpdate: ?(status: RecordingStatus) => void) {
    this._onRecordingStatusUpdate = onRecordingStatusUpdate;
    if (onRecordingStatusUpdate == null) {
      this._disablePolling();
    } else {
      this._enablePollingIfNecessaryAndPossible();
    }
    this.getStatusAsync();
  }

  setProgressUpdateInterval(progressUpdateIntervalMillis: number) {
    this._progressUpdateIntervalMillis = progressUpdateIntervalMillis;
    this.getStatusAsync();
  }

  // Record API

  async prepareToRecordAsync(
    options: RecordingOptions = RECORDING_OPTIONS_PRESET_LOW_QUALITY
  ): Promise<RecordingStatus> {
    _throwIfAudioIsDisabled();

    if (_recorderExists) {
      throw new Error('Only one Recording object can be prepared at a given time.');
    }

    if (this._isDoneRecording) {
      throw new Error('This Recording object is done recording; you must make a new one.');
    }

    if (!options || !options.android || !options.ios) {
      throw new Error(
        'You must provide recording options for android and ios in order to prepare to record.'
      );
    }

    const extensionRegex = /^\.\w+$/;
    if (
      !options.android.extension ||
      !options.ios.extension ||
      !extensionRegex.test(options.android.extension) ||
      !extensionRegex.test(options.ios.extension)
    ) {
      throw new Error(`Your file extensions must match ${extensionRegex.toString()}.`);
    }

    if (!this._canRecord) {
      if (NativeModules.ExponentAV.setUnloadedCallbackForAndroidRecording) {
        NativeModules.ExponentAV.setUnloadedCallbackForAndroidRecording(
          this._cleanupForUnloadedRecorder
        );
      }

      const {
        uri,
        status,
      }: {
        uri: string,
        status: Object, // status is of type RecordingStatus, but without the canRecord field populated.
      } = await NativeModules.ExponentAV.prepareAudioRecorder(options);
      _recorderExists = true;
      this._uri = uri;
      this._options = options;
      this._canRecord = true;
      this._callOnRecordingStatusUpdateForNewStatus(status);
      this._enablePollingIfNecessaryAndPossible();
      return status;
    } else {
      throw new Error('This Recording object is already prepared to record.');
    }
  }

  async startAsync(): Promise<RecordingStatus> {
    return this._performOperationAndHandleStatusAsync(() =>
      NativeModules.ExponentAV.startAudioRecording()
    );
  }

  async pauseAsync(): Promise<RecordingStatus> {
    return this._performOperationAndHandleStatusAsync(() =>
      NativeModules.ExponentAV.pauseAudioRecording()
    );
  }

  async stopAndUnloadAsync(): Promise<RecordingStatus> {
    if (!this._canRecord) {
      if (this._isDoneRecording) {
        throw new Error('Cannot unload a Recording that has already been unloaded.');
      } else {
        throw new Error('Cannot unload a Recording that has not been prepared.');
      }
    }
    // We perform a separate native API call so that the state of the Recording can be updated with
    // the final duration of the recording. (We cast stopStatus as Object to appease Flow)
    const finalStatus: Object = await NativeModules.ExponentAV.stopAudioRecording();
    await NativeModules.ExponentAV.unloadAudioRecorder();
    return this._cleanupForUnloadedRecorder(finalStatus);
  }

  // Read API

  getURI(): ?string {
    return this._uri;
  }

  async createNewLoadedSound(
    initialStatus: PlaybackStatusToSet = {},
    onPlaybackStatusUpdate: ?(status: PlaybackStatus) => void = null
  ): Promise<{ sound: Sound, status: PlaybackStatus }> {
    if (this._uri == null || !this._isDoneRecording) {
      throw new Error('Cannot create sound when the Recording has not finished!');
    }
    return Sound.create(
      // $FlowFixMe: Flow can't distinguish between this literal and Asset
      { uri: this._uri },
      initialStatus,
      onPlaybackStatusUpdate,
      false
    );
  }
}
