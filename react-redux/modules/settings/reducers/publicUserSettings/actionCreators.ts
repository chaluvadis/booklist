import { LOAD_USER_INFO, USER_INFO_LOADING, USER_INFO_LOADED, SET_EDITING_INFO, USER_INFO_SAVING, USER_INFO_SAVED } from "./actionNames";
import ajaxUtil from "util/ajaxUtil";

export const loadPublicUserSettings = () => dispatch => {
  dispatch({ type: USER_INFO_LOADING });
  ajaxUtil.post("/user/getPublicSettings", {}, resp => {
    dispatch({ type: USER_INFO_LOADED, info: resp.info });
  });
};

const createEditingChange = (name, evtName = "value") => evt => dispatch => dispatch({ type: SET_EDITING_INFO, name, value: evt.target[evtName] });

export const editIsPublic = createEditingChange("isPublic", "checked");
export const editPublicName = createEditingChange("publicName");
export const editPublicBooksHeader = createEditingChange("publicBooksHeader");

export const savePublicInfo = () => (dispatch, getState) => {
  let editingState = getState().settingsModule.publicUserSettings.editing;
  dispatch({ type: USER_INFO_SAVING });
  ajaxUtil.post("/user/setPublicSettings", { ...editingState }, resp => {
    dispatch({ type: USER_INFO_SAVED, ...editingState });
  });
};
