import React, { PureComponent, useState } from 'react'
import { Form as FinalForm, Field } from 'react-final-form'
import { ReactComponent as SendIcon } from './send.svg'
import { ReactComponent as LoadingGif } from 'App/Auth/Login/ripple.svg'
import { validate } from './validate'
import './SearchForm.scss'

const SearchForm = ({ visible, onSubmit }) => {
  const [valid, toggleValid] = useState(false)
  const [loaded, toggleLoaded] = useState(true)

  const loadPlaylist = () =>
    new Promise(resolve => {
      if (visible && valid) {
        toggleLoaded(false)
        setTimeout(async () => {
          await onSubmit(valid)
          toggleLoaded(true)
          resolve()
        }, 1000)
      }
    })

  return (
    <div className='playlist-search-form'>
      <FinalForm
        onSubmit={loadPlaylist}
        validate={v => toggleValid(validate(v))}
        render={props => (
          <InputForm
            formProps={props}
            autocomplete={false}
            highlighted={visible}
            valid={valid}
            loaded={loaded}
            loadPlaylist={loadPlaylist}
          />
        )}
      />
    </div>
  )
}

class InputForm extends PureComponent {
  componentDidUpdate(prevProps) {
    const { highlighted, formProps } = this.props
    // Autofocus if search bar is being opened
    if (!prevProps.highlighted && highlighted) {
      this.textInput.focus()
    }
    // Blur if being closed
    if (prevProps.highlighted && !highlighted) {
      this.textInput.blur()
      formProps.form.reset()
    }
  }

  render() {
    const { formProps, highlighted, valid, loaded, loadPlaylist } = this.props

    const { dirty, form } = formProps

    const onSubmit = async e => {
      e.preventDefault()
      await loadPlaylist()
      form.reset()
    }

    const labelClass = highlighted ? 'focused' : ''
    const validClass = valid ? 'valid' : ''
    const invalidClass = !valid && dirty ? 'invalid' : ''

    return (
      <form className='search-form' onSubmit={onSubmit}>
        <div className='search-bar-container'>
          <div className='input-container'>
            <Field
              name='playlist'
              render={({ input }) => (
                <>
                  <input
                    ref={i => (this.textInput = i)}
                    type='text'
                    className='playlist-input'
                    placeholder='Paste a link to a Spotify playlist'
                    spellCheck={false}
                    {...input}
                  />
                  <label
                    className={`playlist-input-label ${labelClass} ${validClass} ${invalidClass}`}
                  />
                </>
              )}
            />
          </div>
          <div className={`cta-container ${validClass}`} onClick={onSubmit}>
            {loaded ? (
              <SendIcon className='cta' />
            ) : (
              <LoadingGif className='loading' />
            )}
          </div>
        </div>

        <div
          className={`form-footer-container ${highlighted &&
            validClass} ${invalidClass}`}
        >
          <div className='footer-content'>
            {invalidClass ? "hmm, are you sure that's a real link?" : ''}
          </div>
        </div>
      </form>
    )
  }
}

export default SearchForm
