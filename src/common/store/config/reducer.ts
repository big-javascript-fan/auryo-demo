import { Reducer } from 'redux';
import { CONFIG } from '../../../config';
import { setToValue } from '../../utils';
import { ConfigActionTypes, ConfigState } from './types';

const initialState = CONFIG.DEFAULT_CONFIG;

export const configReducer: Reducer<ConfigState> = (state = initialState, action) => {
    const { payload, type } = action;

    switch (type) {
        case ConfigActionTypes.SET_TOKEN:
            return {
                ...state,
                token: payload
            };
        case ConfigActionTypes.SET_ALL:
            return {
                ...state,
                ...payload
            };
        case ConfigActionTypes.SET_KEY:
            return {
                ...setToValue(state, payload.value, payload.key)
            };
        default:
            return state;
    }

};
