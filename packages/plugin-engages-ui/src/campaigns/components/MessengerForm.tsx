import FormControl from '@erxes/ui/src/components/form/Control';
import FormGroup from '@erxes/ui/src/components/form/Group';
import ControlLabel from '@erxes/ui/src/components/form/Label';
import { FlexItem, FlexPad } from '@erxes/ui/src/components/step/styles';
import { __, Alert } from 'coreui/utils';
import {
  MESSENGER_KINDS,
  SENT_AS_CHOICES,
} from '@erxes/ui-engage/src/constants';
import React from 'react';
import RichTextEditor from '../containers/RichTextEditor';
import MessengerPreview from '../containers/MessengerPreview';
import {
  IEngageMessenger,
  IEngageScheduleDate,
} from '@erxes/ui-engage/src/types';
import Scheduler from './Scheduler';
import { MAIL_TOOLBARS_CONFIG } from '@erxes/ui/src/constants/integrations';
import { IBrand } from '@erxes/ui/src/brands/types';
import { IUser } from '@erxes/ui/src/auth/types';

type Props = {
  brands: IBrand[];
  onChange: (
    name: 'messenger' | 'content' | 'scheduleDate' | 'fromUserId',
    value?: IEngageMessenger | IEngageScheduleDate | string,
  ) => void;
  users: IUser[];
  hasKind: boolean;
  messageKind: string;
  messenger: IEngageMessenger;
  fromUserId: string;
  content: string;
  scheduleDate: IEngageScheduleDate;
  isSaved?: boolean;
};

type State = {
  fromUserId: string;
  messenger: IEngageMessenger;
  scheduleDate: IEngageScheduleDate;
};

class MessengerForm extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      fromUserId: props.fromUserId,
      messenger: props.messenger,
      scheduleDate: props.scheduleDate,
    };
  }

  changeContent = (key, value) => {
    const messenger = {
      ...this.state.messenger,
    };

    messenger[key] = value;

    this.setState({ messenger });

    this.props.onChange('messenger', messenger);
  };

  changeFromUserId = (fromUserId) => {
    this.setState({ fromUserId });
    this.props.onChange('fromUserId', fromUserId);
  };

  renderKind(hasKind) {
    if (!hasKind) {
      return null;
    }

    const onChange = (e) =>
      this.changeContent('kind', (e.target as HTMLInputElement).value);

    return (
      <FormGroup>
        <ControlLabel>Message type:</ControlLabel>

        <FormControl
          componentClass="select"
          onChange={onChange}
          defaultValue={this.state.messenger.kind}
        >
          <option />{' '}
          {MESSENGER_KINDS.SELECT_OPTIONS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.text}
            </option>
          ))}
        </FormControl>
      </FormGroup>
    );
  }

  renderScheduler() {
    const { messageKind, onChange } = this.props;

    if (messageKind === 'manual') {
      return null;
    }

    return (
      <Scheduler
        scheduleDate={this.state.scheduleDate || ({} as IEngageScheduleDate)}
        onChange={onChange}
      />
    );
  }

  onEditorChange = (content: string) => {
    this.props.onChange('content', content);
  };

  render() {
    const onChangeFrom = (e) =>
      this.changeFromUserId((e.target as HTMLInputElement).value);

    const onChangeContent = (e) => {
      Alert.warning(
        'Please carefully select the brand, it will appear in the selected brand messenger.',
      );
      this.changeContent('brandId', (e.target as HTMLInputElement).value);
    };

    const onChangeSentAs = (e) =>
      this.changeContent('sentAs', (e.target as HTMLInputElement).value);

    const { messenger, messageKind } = this.props;

    return (
      <FlexItem>
        <FlexPad overflow="auto" direction="column" count="3">
          <FormGroup>
            <ControlLabel>{__('Message:')}</ControlLabel>
            <RichTextEditor
              content={this.props.content}
              onChange={this.onEditorChange}
              toolbar={MAIL_TOOLBARS_CONFIG}
              height={300}
              name={`engage_${messageKind}_${messenger.brandId}`}
              isSubmitted={this.props.isSaved}
            />
          </FormGroup>

          <FormGroup>
            <ControlLabel>From:</ControlLabel>
            <FormControl
              componentClass="select"
              onChange={onChangeFrom}
              value={this.state.fromUserId}
            >
              <option />{' '}
              {this.props.users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.details ? user.details.fullName : user.username}
                </option>
              ))}
            </FormControl>
          </FormGroup>

          <FormGroup>
            <ControlLabel>Brand:</ControlLabel>
            <FormControl
              componentClass="select"
              onChange={onChangeContent}
              defaultValue={this.state.messenger.brandId}
            >
              <option />{' '}
              {this.props.brands.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </FormControl>
          </FormGroup>

          {this.renderKind(this.props.hasKind)}

          <FormGroup>
            <ControlLabel>{__('Sent as:')}</ControlLabel>
            <FormControl
              componentClass="select"
              onChange={onChangeSentAs}
              defaultValue={this.state.messenger.sentAs}
            >
              <option />{' '}
              {SENT_AS_CHOICES.SELECT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {__(s.text)}
                </option>
              ))}
            </FormControl>
          </FormGroup>
          {/* TODO enable after engage update */}
          {/* {this.renderScheduler()} */}
        </FlexPad>

        <FlexItem overflow="auto" count="2">
          <MessengerPreview
            sentAs={this.state.messenger.sentAs}
            content={this.props.content}
            fromUserId={this.state.fromUserId}
          />
        </FlexItem>
      </FlexItem>
    );
  }
}

export default MessengerForm;
