import { NormalizedResult } from '../../../types';

// TYPES

export enum ObjectTypes {
    PLAYLISTS = 'PLAYLISTS',
    COMMENTS = 'COMMENTS',
}

export enum PlaylistTypes {
    RELATED = 'RELATED',
    ARTIST_LIKES = 'ARTIST_LIKES',
    ARTIST_TRACKS = 'ARTIST_TRACKS',
    SEARCH = 'SEARCH',
    SEARCH_USER = 'SEARCH_USER',
    SEARCH_TRACK = 'SEARCH_TRACK',
    SEARCH_PLAYLIST = 'SEARCH_PLAYLIST',
}

export interface ObjectsState extends Readonly<{
    [ObjectTypes.PLAYLISTS]: ObjectGroup,
    [ObjectTypes.COMMENTS]: ObjectGroup
}> { }

export interface ObjectGroup {
    [id: string]: ObjectState<NormalizedResult>;
}

export interface ObjectState<T> {
    isFetching: boolean;
    error: string | null;
    meta: object;
    items: Array<T>;
    futureUrl: string | null;
    nextUrl: string | null;
    fetchedItems: number;
}

// ACTIONS

export const enum ObjectsActionTypes {
    SET = '@@objects/SET',
    UNSET = '@@objects/UNSET',
    SET_TRACKS = '@@objects/SET_TRACKS',
    UPDATE_ITEMS = '@@objects/UPDATE_ITEMS',
}
