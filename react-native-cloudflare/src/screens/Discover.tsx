/**
 * Discover — `app.native`'s first `<if test="{isDiscover}">` block:
 * location header, search bar, category chips, the "Happening Tonight"
 * featured card, and the "For you" feed with one-tap Join.
 */
import React from 'react';
import { ScrollView } from 'react-native';

import type { Msg } from '../core/model';
import type { Model } from '../core/model';
import {
  catRows,
  featuredAtt,
  featuredId,
  featuredTime,
  featuredTitle,
  featuredVenue,
  feedRows,
} from '../core/selectors';
import {
  Avatar,
  Badge,
  Button,
  Col,
  Icon,
  ListItem,
  Panel,
  Row,
  Span,
  ToggleButton,
  Txt,
} from '../ui/primitives';

export function Discover({
  model,
  dispatch,
}: {
  model: Model;
  dispatch: (msg: Msg) => void;
}) {
  return (
    <ScrollView style={{ flex: 1 }} accessibilityLabel="Discover">
      <Col padding={16} gap={16}>
        <Row gap={12} cross="center" label="Discover header">
          <Col gap={2} grow={1}>
            <Txt size="sm" color="text_muted">
              TONIGHT IN
            </Txt>
            <Txt>
              <Span weight="bold" scale={1.35}>
                Bushwick
              </Span>
            </Txt>
          </Col>
          <Avatar size={44} label="Your profile">
            A
          </Avatar>
        </Row>

        <Row gap={10} cross="center" padding={12} background="surface" radius="lg" label="Search">
          <Icon name="search" size={15} color="text_muted" />
          <Txt size="sm" color="text_muted">
            Search parties, venues, people
          </Txt>
        </Row>

        <Row gap={6} label="Categories">
          {catRows(model).map((c) => (
            <ToggleButton
              key={c.tag}
              selected={c.active}
              onPress={() => dispatch({ type: 'pick_cat', cat: c.tag })}
            >
              {c.label}
            </ToggleButton>
          ))}
        </Row>

        <Txt size="sm" color="text_muted">
          HAPPENING TONIGHT
        </Txt>
        <Panel
          background="accent"
          radius="xl"
          onPress={() => dispatch({ type: 'open_event', id: featuredId(model) })}
          label={featuredTitle(model)}
        >
          <Col padding={16} gap={8} height={200} main="space_between">
            <Row>
              <Badge variant="secondary">LIVE - {featuredAtt(model)} going</Badge>
            </Row>
            <Col gap={4}>
              <Txt size="heading" color="accent_text">
                {featuredTitle(model)}
              </Txt>
              <Txt color="accent_text">
                {featuredVenue(model)} - {featuredTime(model)}
              </Txt>
            </Col>
          </Col>
        </Panel>

        <Row cross="center">
          <Txt grow={1}>
            <Span weight="bold" scale={1.15}>
              For you
            </Span>
          </Txt>
          <Txt size="sm" color="accent">
            See all
          </Txt>
        </Row>

        <Col gap={12}>
          {feedRows(model).map((e) => (
            <ListItem
              key={e.id}
              padding={12}
              onPress={() => dispatch({ type: 'open_event', id: e.id })}
              label={e.title}
            >
              <Row gap={12} cross="center">
                <Panel background="surface_subtle" radius="md" width={64} height={64}>
                  <Col main="end" padding={8} gap={0} grow={1}>
                    <Txt>
                      <Span weight="bold" scale={1.2}>
                        {e.day}
                      </Span>
                    </Txt>
                    <Txt size="sm" color="text_muted">
                      JUL
                    </Txt>
                  </Col>
                </Panel>
                <Col gap={3} grow={1}>
                  <Txt>
                    <Span weight="bold">{e.title}</Span>
                  </Txt>
                  <Txt size="sm" color="text_muted">
                    {e.venue} - {e.dist}
                  </Txt>
                  <Row gap={8} cross="center">
                    <Badge variant="secondary">{e.price}</Badge>
                    <Txt size="sm" color="text_muted">
                      {e.att} going
                    </Txt>
                  </Row>
                </Col>
                <Button
                  size="sm"
                  variant={e.joined ? 'primary' : 'outline'}
                  onPress={() => dispatch({ type: 'join_event', id: e.id })}
                >
                  {e.statusLabel}
                </Button>
              </Row>
            </ListItem>
          ))}
        </Col>
      </Col>
    </ScrollView>
  );
}
