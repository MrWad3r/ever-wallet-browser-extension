import React from 'react'
import { Step } from '@common'

import Button from '@components/Button'

import SittingMan from '@img/welcome.svg'

import './style.scss'

interface IWelcomePage {
    setStep: (step: Step) => void
}

const WelcomePage: React.FC<IWelcomePage> = ({ setStep }) => (
    <>
        <div className="welcome-page__bg" />
        <div className="welcome-page__content">
            <div>
                <h1 className="welcome-page__content-header-xl">Welcome to Crystal Wallet</h1>
                <h3 className="welcome-page__content-header-s">Create a new wallet or sign in</h3>
                <SittingMan />
            </div>
            <div>
                <div className="welcome-page__content-button">
                    <Button
                        text="Create a new wallet"
                        onClick={() => setStep(Step.CREATE_NEW_WALLET)}
                    />
                </div>
                <Button
                    text="Sign in with seed phrase"
                    white
                    onClick={() => setStep(Step.RESTORE_WALLET)}
                />
            </div>
        </div>
    </>
)

export default WelcomePage