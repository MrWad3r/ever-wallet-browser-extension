import React, { useEffect, useState } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { useForm } from 'react-hook-form'
import { Button } from '../../components/button'
import { connect } from 'react-redux'
import { setSeed } from '../../store/app/actions'
import { AppState } from '../../store/app/types'

const EnterSeedScreen: React.FC<any> = ({ setStep, setSeed, walletType }) => {
    const [words, setWords] = useState('')
    const [localSeed, setLocalSeed] = useState<string[]>([])

    const { handleSubmit, errors } = useForm()

    const seedLength = walletType === 'WalletV3' ? 24 : 12

    useEffect(() => {
        setLocalSeed(words?.split(/[ ,]+/).filter((el) => el !== ''))
    }, [words])

    const onSubmit = () => {
        setStep(9)
        setSeed(localSeed)
    }

    return (
        <div className="create-password-page__content">
            <div className="create-password-page__content-pwd-form">
                <h2 className="create-password-page__content-pwd-form-header">
                    Enter your seed phrase
                </h2>
                <form id="password" onSubmit={handleSubmit(onSubmit)}>
                    <TextareaAutosize
                        autoFocus
                        placeholder={'Separate words with comma or space'}
                        onChange={(event: { target: { value: React.SetStateAction<string> } }) =>
                            setWords(event.target.value)
                        }
                    />
                    {/*<Input*/}
                    {/*    label={'Separate words with comma or space'}*/}
                    {/*    autoFocus*/}
                    {/*    type={'text'}*/}
                    {/*    name="seed"*/}
                    {/*    register={register({*/}
                    {/*        required: true,*/}
                    {/*        minLength: 6,*/}
                    {/*    })}*/}
                    {/*/>*/}
                    <div className="words-count">{`${localSeed.length}/${seedLength} words`}</div>
                    {errors.pwd && (
                        <div className="check-seed__content-error">
                            The seed is required and must be minimum 6 characters long
                        </div>
                    )}
                </form>
            </div>
            <div className="create-password-page__content-buttons">
                <Button
                    text={'Confirm'}
                    disabled={localSeed.length < seedLength}
                    type="submit"
                    form="password"
                />
                <Button text={'Back'} white onClick={() => setStep(7)} />
            </div>
        </div>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    walletType: store.app.walletType,
})

export default connect(mapStateToProps, {
    setSeed,
})(EnterSeedScreen)
