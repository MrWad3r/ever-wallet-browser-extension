import React, { useMemo } from 'react'
import Input from '../../components/Input/Input'
import { Button } from '../../components/button'
import './create-password.scss'
import { useForm } from 'react-hook-form'
import CheckSeedInput from '../../components/CheckSeedInput/CheckSeedInput'

interface ICreatePasswordScreen {
    setStep: (arg0: number) => void
}

const CreatePasswordScreen: React.FC<ICreatePasswordScreen> = ({ setStep }) => {
    const { register, handleSubmit, errors, watch } = useForm()

    const onSubmit = () => {
        setStep(5)
    }

    return (
        <div className="create-password-page__content">
            <div className="create-password-page__content-pwd-form">
                <h2>Create a password</h2>
                <h3 className="create-password-page__content-pwd-title">
                    We will ask for it at each transaction. If you forget it, you will need to
                    restore the wallet from the seed phrase
                </h3>
                <form id="password" onSubmit={handleSubmit(onSubmit)}>
                    <Input
                        label={'Your password'}
                        autoFocus
                        type={'password'}
                        name="pwd"
                        register={register({
                            required: true,
                            minLength: 6,
                        })}
                    />
                    <Input
                        label={'Confirm password'}
                        type={'password'}
                        name="pwdConfirm"
                        register={register({
                            required: true,
                            validate: (value) => value === watch('pwd'),
                        })}
                    />
                    {errors.pwd && (
                        <div className="check-seed__content-error">
                            The password is required and must be minimum 6 characters long
                        </div>
                    )}
                    {errors.pwdConfirm && (
                        <div className="check-seed__content-error">Your password doesn't match</div>
                    )}
                </form>
            </div>
            <div className="create-password-page__content-buttons">
                <Button text={'Next'} type="submit" form="password" />
                <Button text={'Back'} white />
            </div>
        </div>
    )
}

export default CreatePasswordScreen
