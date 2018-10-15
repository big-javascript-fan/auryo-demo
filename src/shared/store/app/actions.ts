import { ipcRenderer } from 'electron';
import * as moment from 'moment';
import { toastr } from 'react-redux-toastr';
import { push, replace } from 'react-router-redux';
import { Dimensions } from 'react-virtualized';
import { ThunkResult } from 'src/types';
import { action } from 'typesafe-actions';
import fetchToJson from '../../api/helpers/fetchToJson';
import { EVENTS } from '../../constants/events';
import { SC } from '../../utils';
import { getAuth, getAuthFeed, getAuthFollowings, getAuthLikeIds, getAuthLikesIfNeeded, getAuthPlaylists, getAuthReposts } from '../auth/actions';
import { setConfigKey } from '../config';
import { changeTrack, ChangeTypes, PlayerStatus, toggleStatus, VolumeChangeTypes } from '../player';
import { toggleLike, toggleRepost } from '../track/actions';
import { AppActionTypes, CanGoHistory } from './types';

export function initApp(): ThunkResult<void> {
    return (dispatch, getState) => {

        const { config: { token } } = getState();

        if (!token) {
            dispatch(replace('/login'));
            return;
        }

        SC.initialize(token);

        dispatch(initWatchers());

        if (process.env.NODE_ENV === 'development') {
            dispatch(action(AppActionTypes.RESET_STORE));
        }

        return dispatch(action(AppActionTypes.SET_LOADED, Promise.all([
            dispatch(getAuth()),
            dispatch(getAuthFollowings()),
            dispatch(getAuthReposts()),

            dispatch(getAuthFeed()),
            dispatch(getAuthLikesIfNeeded()),
            dispatch(getAuthLikeIds()),
            dispatch(getAuthPlaylists())
        ])));
    };
}

export const setDimensions = (dimensions: Dimensions) => action(AppActionTypes.SET_DIMENSIONS, dimensions);
export const canGoInHistory = (canGoHistory: CanGoHistory) => action(AppActionTypes.SET_CAN_GO, canGoHistory);

export const toggleOffline = (offline: boolean) => action(AppActionTypes.TOGGLE_OFFLINE, {
    time: new Date().getTime(),
    offline
});
export const setUpdateAvailable = (version: string) => action(AppActionTypes.SET_UPDATE_AVAILABLE, {
    version
});

let listeners: Array<any> = [];

export function initWatchers(): ThunkResult<any> {
    return (dispatch, getState) => {

        if (!listeners.length) {
            listeners.push({
                event: 'navigate',
                handler: (_e: any, data: any) => {
                    dispatch(push(data));
                }
            });

            listeners.push({
                event: EVENTS.PLAYER.CHANGE_TRACK,
                handler: (_e: any, data: ChangeTypes) => {
                    dispatch(changeTrack(data));
                }
            });

            listeners.push({
                event: EVENTS.PLAYER.CHANGE_VOLUME,
                handler: (_e: any, data: VolumeChangeTypes) => {
                    const { config: { volume } } = getState();

                    let new_volume = volume + .05;

                    if (data === VolumeChangeTypes.DOWN) {
                        new_volume = volume - .05;
                    }

                    if (new_volume > 1) {
                        new_volume = 1;
                    } else if (new_volume < 0) {
                        new_volume = 0;
                    }

                    if (volume !== new_volume) {
                        dispatch(setConfigKey('volume', new_volume));
                    }
                }
            });

            listeners.push({
                event: EVENTS.PLAYER.TOGGLE_STATUS,
                handler: (_e: any, newStatus: PlayerStatus) => {

                    const { player: { status } } = getState();

                    if (!newStatus || typeof newStatus !== 'string') {
                        newStatus = status !== PlayerStatus.PLAYING ? PlayerStatus.PLAYING : PlayerStatus.PAUSED;
                    }
                    dispatch(toggleStatus(newStatus));
                }
            });

            listeners.push({
                event: EVENTS.TRACK.LIKE,
                handler: (_e: any, trackId: string) => {
                    if (trackId) {
                        dispatch(toggleLike(trackId, false));
                    }
                }
            });

            listeners.push({
                event: EVENTS.TRACK.REPOST,
                handler: (_e: string, trackId: string) => {
                    if (trackId) {
                        dispatch(toggleRepost(trackId, false));
                    }
                }
            });

            listeners.push({
                event: EVENTS.APP.STREAMED,
                handler: () => {
                    // TODO can we do this in main?

                    const { config: { app: { analytics } } } = getState();

                    if (process.env.NODE_ENV === 'production' && analytics) {
                        const ua = require('../../utils/universalAnalytics');
                        ua().event('SoundCloud', 'Play').send();
                    }
                }
            });

            listeners.push({
                event: EVENTS.APP.STREAM_ERROR,
                handler: (_e: any, httpResponse: number, url: string): void => {

                    const { config: { app: { analytics } } } = getState();

                    switch (httpResponse) {
                        case 404:
                            toastr.error('Not found!', 'This resource might not exists anymore');
                            break;
                        case 429:
                            if (!url) return;

                            fetchToJson(url)
                                .then((json: any) => {
                                    // TODO can we do this in main?
                                    if (json.errors && json.errors.length > 0) {
                                        const error = json.errors[0];

                                        if (error.meta.rate_limit) {

                                            toastr.error('Stream limit reached!', `Unfortunately the API enforces a 15K plays/hour limit. this limit will expire in ${moment(error.meta.reset_time).toNow()}`);

                                            if (process.env.NODE_ENV === 'production' && analytics) {
                                                const ua = require('../../utils/universalAnalytics');
                                                ua().event('SoundCloud', 'Play').send();
                                            }
                                        }
                                    }
                                });
                        default:
                            break;
                    }
                }
            });

            listeners.push({
                event: EVENTS.APP.UPDATE_AVAILABLE,
                handler: (_e: any, data: { currentVersion: string, version: string }) => {
                    dispatch(setUpdateAvailable(data.version));
                    // TODO can we do this in main?

                    toastr.success(`Update available v${data.version}`, `Current version: ${data.currentVersion}`, {
                        timeOut: 5000,
                        showCloseButton: false
                    });

                }
            });

            listeners.forEach((l) => {
                ipcRenderer.on(l.event, l.handler);
            });
        }
    };
}

export function stopWatchers(): void {
    listeners.forEach((l) => {
        ipcRenderer.removeListener(l.event, l.handler);
    });

    listeners = [];
}
