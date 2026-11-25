import { createContext, useContext } from 'react'

/** How many dialogs, sheets or alerts are already open around this one.
 * Every layer dims what's behind it (no blur); one opened on top dims
 * the layer below a little more lightly, so only the frontmost reads as
 * active. */
export const LayerDepth = createContext(0)
export const useLayerDepth = () => useContext(LayerDepth)
