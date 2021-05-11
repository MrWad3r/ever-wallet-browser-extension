import React from 'react'
import { getIconUrl } from '@popup/utils'

import './style.scss'

interface IWebsiteIcon {
    origin: string
}

const WebsiteIcon: React.FC<IWebsiteIcon> = ({ origin }) => (
    <img className="website-icon noselect" src={getIconUrl(origin)} alt="page" />
)

export default WebsiteIcon
