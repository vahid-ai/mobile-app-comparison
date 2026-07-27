/**
 * Event detail — `app.native`'s `<if test="{isDetail}">` block: hero,
 * date and venue rows, the host follow toggle, about, who's-going, and the
 * sticky Interested / "Get on the list" RSVP bar.
 *
 * RSVP state round-trips everywhere: the same `toggle_going` the feed's
 * Join buttons reach through `join_event` drives the CTA here, and both
 * land in D1 through the store.
 */
import React from 'react';
import { Pressable, ScrollView } from 'react-native';

import type { Model, Msg } from '../core/model';
import {
  selAbout,
  selArea,
  selAtt,
  selCatLabel,
  selDateNum,
  selDayName,
  selDist,
  selFollowed,
  selFriends,
  selGoing,
  selHost,
  selHostInit,
  selInterested,
  selOthers,
  selTime,
  selTitle,
  selVenue,
} from '../core/selectors';
import {
  Avatar,
  Badge,
  Button,
  Col,
  Icon,
  Panel,
  Row,
  Spacer,
  Span,
  Txt,
} from '../ui/primitives';

export function Detail({
  model,
  dispatch,
}: {
  model: Model;
  dispatch: (msg: Msg) => void;
}) {
  return (
    <Col grow={1} label="Event detail">
      <ScrollView style={{ flex: 1 }} accessibilityLabel="Event">
        <Col>
          <Panel background="accent">
            <Col padding={16} gap={10} height={250}>
              <Row>
                <Button
                  variant="secondary"
                  icon="chevron-left"
                  onPress={() => dispatch({ type: 'back' })}
                  label="Back"
                />
                <Spacer grow={1} />
              </Row>
              <Spacer grow={1} />
              <Row>
                <Badge variant="secondary">{selCatLabel(model)}</Badge>
              </Row>
              <Txt size="heading" color="accent_text">
                {selTitle(model)}
              </Txt>
            </Col>
          </Panel>

          <Col padding={16} gap={12}>
            <Row gap={12} cross="center" padding={12} background="surface" radius="lg" label="Date">
              <Panel background="surface_subtle" radius="md" width={46} height={46}>
                <Col main="center" cross="center" grow={1}>
                  <Txt color="accent">
                    <Span weight="bold">{selDateNum(model)}</Span>
                  </Txt>
                  <Txt size="sm" color="accent">
                    JUL
                  </Txt>
                </Col>
              </Panel>
              <Col gap={2} grow={1}>
                <Txt>
                  <Span weight="bold">
                    {selDayName(model)}, July {selDateNum(model)}
                  </Span>
                </Txt>
                <Txt size="sm" color="text_muted">
                  {selTime(model)} - late
                </Txt>
              </Col>
            </Row>

            <Row gap={12} cross="center" padding={12} background="surface" radius="lg" label="Venue">
              <Panel background="surface_subtle" radius="md" width={46} height={46}>
                <Col main="center" cross="center" grow={1}>
                  <Icon name="circle-dot" size={14} color="accent" />
                </Col>
              </Panel>
              <Col gap={2} grow={1}>
                <Txt>
                  <Span weight="bold">{selVenue(model)}</Span>
                </Txt>
                <Txt size="sm" color="text_muted">
                  {selArea(model)} - {selDist(model)} away
                </Txt>
              </Col>
              {/* the markup's `<text ... on-press="go_map">Map</text>` link */}
              <Pressable
                onPress={() => dispatch({ type: 'go_map' })}
                accessibilityRole="link"
                accessibilityLabel="Map"
                hitSlop={8}
              >
                <Txt size="sm" color="accent">
                  Map
                </Txt>
              </Pressable>
            </Row>

            <Row gap={12} cross="center" label="Host">
              <Avatar size={44}>{selHostInit(model)}</Avatar>
              <Col gap={2} grow={1}>
                <Txt size="sm" color="text_muted">
                  Hosted by
                </Txt>
                <Txt>
                  <Span weight="bold">{selHost(model)}</Span>
                </Txt>
              </Col>
              {selFollowed(model) ? (
                <Button
                  size="sm"
                  variant="secondary"
                  icon="check"
                  onPress={() => dispatch({ type: 'toggle_follow' })}
                >
                  Following
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => dispatch({ type: 'toggle_follow' })}
                >
                  Follow
                </Button>
              )}
            </Row>

            <Txt>
              <Span weight="bold" scale={1.1}>
                About
              </Span>
            </Txt>
            <Txt color="text_muted">{selAbout(model)}</Txt>

            <Row cross="center">
              <Txt grow={1}>
                <Span weight="bold" scale={1.1}>
                  Who&apos;s going
                </Span>
              </Txt>
              <Txt size="sm" color="text_muted">
                {selAtt(model)}
              </Txt>
            </Row>
            <Panel background="surface" radius="lg">
              <Row padding={12} gap={10} cross="center">
                <Row gap={2}>
                  <Avatar size={30}>MR</Avatar>
                  <Avatar size={30}>DZ</Avatar>
                  <Avatar size={30}>KT</Avatar>
                  <Avatar size={30}>PA</Avatar>
                  <Avatar size={30}>LM</Avatar>
                </Row>
                <Txt size="sm" grow={1}>
                  <Span weight="bold">{selFriends(model)} friends</Span> and {selOthers(model)}{' '}
                  others
                </Txt>
              </Row>
            </Panel>
          </Col>
        </Col>
      </ScrollView>

      <Row padding={12} gap={10} cross="center" background="surface" label="Actions">
        {selInterested(model) ? (
          <Button
            variant="secondary"
            icon="check"
            onPress={() => dispatch({ type: 'toggle_interested' })}
            label="Saved"
          />
        ) : (
          <Button
            variant="outline"
            icon="circle-dot"
            onPress={() => dispatch({ type: 'toggle_interested' })}
            label="Save for later"
          />
        )}
        {selGoing(model) ? (
          <Button
            grow={1}
            variant="outline"
            icon="check"
            onPress={() => dispatch({ type: 'toggle_going' })}
          >
            You&apos;re in
          </Button>
        ) : (
          <Button grow={1} variant="primary" onPress={() => dispatch({ type: 'toggle_going' })}>
            Get on the list
          </Button>
        )}
      </Row>
    </Col>
  );
}
