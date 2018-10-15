/* eslint-disable global-require */
import { ipcRenderer } from 'electron';
import { action } from 'typesafe-actions';
import { ThunkResult, SoundCloud } from '../../../types';
import { getPlaylist, setObject } from '../objects/actions';
import fetchToJson from '../../api/helpers/fetchToJson';
import fetchToObject from '../../api/helpers/fetchToObject';
import { PLAYLISTS } from '../../constants';
import { EVENTS } from '../../constants/events';
import { SC } from '../../utils';
import { setToken } from '../config/actions';
import { AuthActionTypes } from './types';
import { ObjectTypes } from '../objects';
import fetchPlaylists from '../../api/fetchPlaylists';
import { replace } from 'connected-react-router';

export function logout(): ThunkResult<void> {
    return (dispatch) => {
        dispatch({
            type: 'APP_RESET_STORE'
        });
        dispatch(replace('/login'));
        dispatch(setToken(null));
    };
}

export function login(): ThunkResult<void> {
    return (dispatch) => {
        ipcRenderer.send(EVENTS.APP.AUTH.LOGIN);

        ipcRenderer.once('login-success', () => {

            dispatch(replace('/'));

        });
    };
}

export const setLoginError = (data: string) => action(AuthActionTypes.ERROR, data);

export const setLoginLoading = (loading = true) => action(AuthActionTypes.LOADING, loading);

export function getAuth(): ThunkResult<void> {
    return (dispatch, getState) => {
        const { config: { app: { analytics } } } = getState();

        dispatch(action(AuthActionTypes.SET, fetchToJson<SoundCloud.User>(SC.getMeUrl())
            .then((user) => {
                if (process.env.NODE_ENV === 'production' && analytics) {
                    const ua = require('../../utils/universalAnalytics');

                    ua().set('userId', user.id);
                }
                return user;
            })));
    };
}

export function getAuthTracksIfNeeded(): ThunkResult<void> {
    return (dispatch, getState) => {
        const { objects, auth: { me } } = getState();

        if (!me || !me.id) return;

        const playlist_objects = objects[ObjectTypes.PLAYLISTS];
        const playlist_object = playlist_objects[PLAYLISTS.MYTRACKS];

        if (!playlist_object) {
            dispatch(getPlaylist(SC.getUserTracksUrl(me.id), PLAYLISTS.MYTRACKS));
        }
    };
}

export function getAuthAllPlaylistsIfNeeded(): ThunkResult<void> {
    return (dispatch, getState) => {
        const { objects, auth: { me } } = getState();

        if (!me || !me.id) return;

        const playlist_objects = objects[ObjectTypes.PLAYLISTS];
        const playlist_object = playlist_objects[PLAYLISTS.PLAYLISTS];

        if (!playlist_object) {
            dispatch(getPlaylist(SC.getAllUserPlaylistsUrl(me.id), PLAYLISTS.PLAYLISTS));
        }
    };
}

/**
 * Get auth like ids
 *
 * @returns {function(*)}
 */

export function getAuthLikeIds(): ThunkResult<Promise<any>> {
    return (dispatch) => Promise.all([
        dispatch({
            type: AuthActionTypes.SET_LIKES,
            payload: fetchToObject(SC.getLikeIdsUrl())
        }),
        dispatch({
            type: AuthActionTypes.SET_PLAYLIST_LIKES,
            payload: fetchToObject(SC.getPlaylistLikeIdsUrl())
        }),
    ]);
}

/**
 * Get auth likes playlist if needed
 *
 * @returns {function(*, *)}
 */
export function getAuthLikesIfNeeded(): ThunkResult<void> {
    return (dispatch, getState) => {
        const { objects } = getState();

        const playlist_objects = objects[ObjectTypes.PLAYLISTS];
        const playlist_object = playlist_objects[PLAYLISTS.LIKES];

        if (!playlist_object) {
            dispatch(getPlaylist(SC.getLikesUrl(), PLAYLISTS.LIKES));
        }
    };
}


export const getAuthFollowings = () => action(AuthActionTypes.SET_FOLLOWINGS, fetchToObject(SC.getFollowingsUrl()));

/**
 * Toggle following of a specific user
 *
 * @param user_id
 * @returns {function(*, *)}
 */
export function toggleFollowing(userId: number): ThunkResult<void> {
    return (dispatch, getState) => {
        const { auth: { followings } } = getState();

        const following = SC.hasID(userId, followings);

        dispatch({
            type: AuthActionTypes.SET_FOLLOWING,
            payload: fetchToJson(SC.updateFollowingUrl(userId), {
                method: (!following) ? 'PUT' : 'DELETE'
            }).then(() => ({
                userId,
                following: !following
            }))
        });

    };
}

export function getAuthReposts() {
    return {
        type: AuthActionTypes.SET_REPOSTS,
        payload: fetchToObject(SC.getRepostIdsUrl())
    };
}

export function getAuthFeed(refresh?: boolean): ThunkResult<Promise<any>> {
    return (dispatch, getState) => {
        const { config: { hideReposts } } = getState();

        return dispatch<Promise<any>>(getPlaylist(SC.getFeedUrl(hideReposts ? 40 : 20), PLAYLISTS.STREAM, { refresh }));
    };
}

/**
 * Get playlists from the authenticated user
 *
 * @returns {function(*=)}
 */
export function getAuthPlaylists(): ThunkResult<any> {
    return (dispatch) => dispatch({
        type: AuthActionTypes.SET_PLAYLISTS,
        payload: {
            promise: fetchPlaylists()
                .then(({
                    normalized
                }) => {
                    normalized.result.forEach((playlistResult) => {
                        if (normalized.entities.playlistEntities && normalized.entities.playlistEntities[playlistResult.id]) {
                            const playlist = normalized.entities.playlistEntities[playlistResult.id];

                            dispatch(setObject(
                                playlistResult.id.toString(),
                                ObjectTypes.PLAYLISTS,
                                {},
                                playlist.tracks
                            ));
                        }

                    });

                    return normalized;
                })
        }
    });
}
