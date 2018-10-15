import { flattenDeep } from 'lodash';
import { normalize, schema } from 'normalizr';
import { action } from 'typesafe-actions';
import { GetPlaylistOptions, NormalizedEntities, NormalizedResult, SoundCloud, ThunkResult } from '../../../types';
import fetchComments from '../../api/fetchComments';
import fetchPlaylist from '../../api/fetchPlaylist';
import fetchToJson from '../../api/helpers/fetchToJson';
import { trackSchema } from '../../schemas';
import { SC } from '../../utils';
import { SortTypes } from '../playlist/types';
import { ObjectsActionTypes, ObjectState, ObjectTypes } from './types';
import { PlayerActionTypes } from '../player';

/**
 * Check if there is more to fetch, if so, fetch more
 *
 * @param objectId
 * @param type
 * @returns {function(*, *)}
 */
export function fetchMore(objectId: string, objectType: ObjectTypes): ThunkResult<Promise<any>> {
    return (dispatch, getState) => {
        const { objects } = getState();
        const object_group = objects[objectType] || {};

        if (canFetchMore(object_group[objectId])) {
            const { nextUrl } = object_group[objectId];

            if (nextUrl) {
                switch (objectType) {
                    case ObjectTypes.PLAYLISTS:
                        return dispatch<Promise<any>>(getPlaylist(nextUrl, objectId));
                    case ObjectTypes.COMMENTS:
                        return dispatch<Promise<any>>(getCommentsByUrl(nextUrl, objectId));
                    default:
                        break;
                }
            }
        }

        return Promise.resolve();
    };
}

export function canFetchMoreOf(objectId: string, type: ObjectTypes): ThunkResult<boolean> {
    return (_dispatch, getState) => {
        const { objects } = getState();
        const object_group = objects[type] || {};

        return canFetchMore(object_group[objectId]);
    };

}

const canFetch = (current: ObjectState<any>): boolean => !current || (!!current && !current.isFetching);
const canFetchMore = (current: ObjectState<any>): boolean => canFetch(current) && (current && current.nextUrl !== null);

// TODO refactor, too hacky. Maybe redux-observables?
// tslint:disable-next-line:max-line-length
export function getPlaylist(url: string, objectId: string, options: GetPlaylistOptions = { refresh: false, appendId: null }): ThunkResult<Promise<any>> {
    return (dispatch, getState) => {
        const { objects, config: { hideReposts } } = getState();

        const playlists = objects[ObjectTypes.PLAYLISTS] || {};

        return (dispatch({
            type: ObjectsActionTypes.SET,
            payload: {
                promise: fetchPlaylist(url, objectId, hideReposts)
                    .then(({ normalized, json }) => ({
                        objectId,
                        objectType: ObjectTypes.PLAYLISTS,
                        entities: normalized.entities,
                        result: options.appendId ? [{ id: options.appendId, schema: 'tracks' }, ...normalized.result] : normalized.result,
                        nextUrl: (json.next_href) ? SC.appendToken(json.next_href) : null,
                        futureUrl: (json.future_href) ? SC.appendToken(json.future_href) : null,
                        refresh: options.refresh
                    })),
                data: {
                    objectId,
                    objectType: ObjectTypes.PLAYLISTS
                }
            }
        }) as any)
            .then(({ value }: { value: { result: Array<NormalizedResult> } }) => {
                const { player: { currentPlaylistId, queue }, entities: { playlistEntities, trackEntities } } = getState();

                if (objectId === currentPlaylistId && value.result.length) {

                    if (value && value.result) {

                        const { result } = value;

                        if (result.length) {
                            dispatch({
                                type: PlayerActionTypes.QUEUE_INSERT,
                                payload: {
                                    items: flattenDeep(result
                                        .filter((trackIdSchema) => (trackIdSchema && trackIdSchema.schema !== 'users'))
                                        .map((trackIdSchema) => {
                                            const id = trackIdSchema.id;

                                            const playlist = playlistEntities[id];
                                            const playlist_object = playlists[id];

                                            if (playlist) {

                                                if (!playlist_object) {

                                                    dispatch({
                                                        type: ObjectsActionTypes.SET,
                                                        payload: {
                                                            objectId: id,
                                                            objectType: ObjectTypes.PLAYLISTS,
                                                            result: playlist.tracks,
                                                            fetchedItems: 0
                                                        }
                                                    });

                                                    dispatch(fetchPlaylistTracks(id, 50));

                                                }

                                                return playlist.tracks.map((trackIdResult) => {
                                                    const trackId = trackIdResult.id;

                                                    if (trackEntities[trackId] && !trackEntities[trackId].streamable) {
                                                        return null;
                                                    }

                                                    return {
                                                        id: trackId,
                                                        playlistId: id.toString(),
                                                        // un: new Date().getTime()
                                                    };
                                                }).filter((t) => t != null);
                                            }

                                            return {
                                                id,
                                                playlistId: currentPlaylistId,
                                                // un: new Date().getTime()
                                            };
                                        })),
                                    index: queue.length
                                }
                            });
                        }
                    }


                }
            });
    };
}

export function getComments(trackId: number) {
    return getCommentsByUrl(SC.getCommentsUrl(trackId), trackId.toString());
}

function getCommentsByUrl(url: string, objectId: string): ThunkResult<Promise<any>> {
    return (dispatch, getState) => {
        const { objects } = getState();

        const objectType = ObjectTypes.COMMENTS;
        const comments = objects[objectType];

        if (!canFetch(comments[objectId])) return Promise.resolve();

        return dispatch<Promise<any>>({
            type: ObjectsActionTypes.SET,
            payload: {
                promise: fetchComments(url)
                    .then(({ normalized, json }) => ({
                        objectId,
                        objectType,
                        entities: normalized.entities,
                        result: normalized.result,
                        nextUrl: (json.next_href) ? SC.appendToken(json.next_href) : null,
                        futureUrl: (json.future_href) ? SC.appendToken(json.future_href) : null
                    })),
                data: {
                    objectId,
                    objectType
                }
            }
        } as any);
    };
}

export const setObject = (
    objectId: string,
    objectType: ObjectTypes,
    entities: NormalizedEntities,
    result: Array<NormalizedResult>,
    nextUrl = null,
    futureUrl = null
) => {
    return action(ObjectsActionTypes.SET, {
        objectId,
        objectType,
        entities,
        result,
        nextUrl: (nextUrl) ? SC.appendToken(nextUrl) : null,
        futureUrl: (futureUrl) ? SC.appendToken(futureUrl) : null
    });
};


export function fetchPlaylistIfNeeded(playlistId: number): ThunkResult<Promise<any>> {
    return (dispatch, getState) => {
        const {
            objects
        } = getState();

        const playlist_objects = objects[ObjectTypes.PLAYLISTS];
        const playlist_object = playlist_objects[playlistId];

        if (!playlist_object || (playlist_object && playlist_object.fetchedItems === 0)) {
            return dispatch<Promise<any>>({
                type: ObjectsActionTypes.SET,
                payload: {
                    promise: fetchPlaylist(SC.getPlaylistTracksUrl(playlistId), playlistId.toString())
                        .then(({
                            normalized,
                            json
                        }) => {
                            if (normalized.entities && normalized.entities.playlistEntities) {
                                const playlist = normalized.entities.playlistEntities[playlistId];

                                let fetchedItems = normalized.result.length;

                                if (json.tracks) {
                                    fetchedItems = json.tracks.filter((t: Partial<SoundCloud.Track>) => t.user !== undefined).length;
                                }

                                return {
                                    objectId: playlistId,
                                    objectType: ObjectTypes.PLAYLISTS,
                                    entities: normalized.entities,
                                    result: playlist.tracks,
                                    nextUrl: (json.next_href) ? SC.appendToken(json.next_href) : null,
                                    futureUrl: (json.future_href) ? SC.appendToken(json.future_href) : null,
                                    fetchedItems
                                };
                            }

                            return {};
                        }),
                    data: {
                        objectId: playlistId,
                        objectType: ObjectTypes.PLAYLISTS
                    }
                }
            } as any)
                .then(() => {
                    dispatch(fetchPlaylistTracks(playlistId));
                });
        }


        return Promise.resolve();
    };
}

/**
 * Fetch new chart if needed
 *
 * @returns {function(*, *)}
 * @param objectId
 * @param sortType
 */
export function fetchChartsIfNeeded(objectId: string, sortType: SortTypes = SortTypes.TOP): ThunkResult<void> {
    return (dispatch, getState) => {
        const { objects } = getState();

        const playlist_objects = objects[ObjectTypes.PLAYLISTS];
        const playlist_object = playlist_objects[objectId];

        if (!playlist_object) {
            dispatch(getPlaylist(SC.getChartsUrl(objectId.split('_')[0], sortType, 25), objectId));
        }
    };
}

export function canFetchPlaylistTracks(playlistId: string): ThunkResult<void> {
    return (_dispatch, getState) => {
        const {
            objects
        } = getState();

        const playlist_objects = objects[ObjectTypes.PLAYLISTS];
        const playlist_object = playlist_objects[playlistId];


        if (!playlist_object || playlist_object.fetchedItems === playlist_object.items.length || playlist_object.isFetching) {
            return false;
        }

        let new_count = playlist_object.fetchedItems + 20;

        if (new_count > playlist_object.items.length) {
            new_count = playlist_object.items.length;
        }

        const ids = playlist_object.items.slice(playlist_object.fetchedItems, new_count);

        return !!ids.length;


    };
}

export function fetchPlaylistTracks(playlistId: number, size: number = 20, ids?: Array<NormalizedResult>): ThunkResult<Promise<any>> {
    return (dispatch, getState) => {
        const {
            objects
        } = getState();

        const playlist_objects = objects[ObjectTypes.PLAYLISTS];
        const playlist_object = playlist_objects[playlistId];

        if (!playlist_object) {
            dispatch(fetchPlaylistIfNeeded(playlistId));

            return Promise.resolve();
        }

        if ((playlist_object.fetchedItems === playlist_object.items.length || playlist_object.isFetching) && !ids) {
            return Promise.resolve();
        }

        if (!ids) {
            let new_count = playlist_object.fetchedItems + size;

            if (new_count > playlist_object.items.length) {
                new_count = playlist_object.items.length;
            }

            ids = playlist_object.items.slice(playlist_object.fetchedItems, new_count);

        }

        if (ids && ids.length) {
            return dispatch<Promise<any>>({
                type: ObjectsActionTypes.SET_TRACKS,
                payload: {
                    promise: fetchToJson(SC.getTracks(ids.map((id) => id.id)))
                        .then((tracks) => {

                            const normalized = normalize(tracks, new schema.Array({
                                tracks: trackSchema
                            }, (input) => `${input.kind}s`));

                            return {
                                objectId: playlistId,
                                objectType: ObjectTypes.PLAYLISTS,
                                entities: normalized.entities,
                                fetchedItems: size
                            };
                        }),
                    data: {
                        objectId: playlistId
                    }
                }
            } as any);
        }

        return Promise.resolve();
    };
}

export function fetchTracks(ids: Array<number>): ThunkResult<void> {
    return (dispatch) => {
        if (!ids || (ids && !ids.length)) return;

        dispatch({
            type: ObjectsActionTypes.SET_TRACKS,
            payload: {
                promise: fetchToJson(SC.getTracks(ids))
                    .then((tracks) => {

                        const normalized = normalize(tracks, new schema.Array({
                            tracks: trackSchema
                        }, (input) => `${input.kind}s`));

                        return {
                            entities: normalized.entities
                        };
                    }),
                data: {
                    entities: {
                        trackEntities: ids.reduce((obj, id) => ({
                            ...obj,
                            [id]: {
                                loading: true
                            }
                        }), {})
                    }
                }
            }
        });

    };
}
