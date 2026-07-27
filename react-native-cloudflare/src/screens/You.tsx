/**
 * You — `app.native`'s `<if test="{isYou}">` block: profile header, the
 * three stats, the groups grid, and the group chats with unread badges.
 */
import React from 'react';
import { ScrollView } from 'react-native';

import type { Model } from '../core/model';
import { chatRows, groupRows } from '../core/selectors';
import { Avatar, Badge, Col, Grid, Panel, Row, Separator, Span, Txt } from '../ui/primitives';

export function You({ model }: { model: Model }) {
  return (
    <ScrollView style={{ flex: 1 }} accessibilityLabel="Profile">
      <Col padding={16} gap={16}>
        <Col cross="center" gap={6} label="Profile header">
          <Avatar size={88} label="Alex Rivera">
            A
          </Avatar>
          <Txt>
            <Span weight="bold" scale={1.3}>
              Alex Rivera
            </Span>
          </Txt>
          <Txt size="sm" color="text_muted">
            @alexr - Bushwick
          </Txt>
        </Col>

        <Row gap={12} label="Stats">
          <Col grow={1} cross="center" gap={2}>
            <Txt>
              <Span weight="bold" scale={1.2}>
                28
              </Span>
            </Txt>
            <Txt size="sm" color="text_muted">
              Events
            </Txt>
          </Col>
          <Separator />
          <Col grow={1} cross="center" gap={2}>
            <Txt>
              <Span weight="bold" scale={1.2}>
                342
              </Span>
            </Txt>
            <Txt size="sm" color="text_muted">
              Friends
            </Txt>
          </Col>
          <Separator />
          <Col grow={1} cross="center" gap={2}>
            <Txt>
              <Span weight="bold" scale={1.2}>
                6
              </Span>
            </Txt>
            <Txt size="sm" color="text_muted">
              Groups
            </Txt>
          </Col>
        </Row>

        <Txt size="sm" color="text_muted">
          YOUR GROUPS
        </Txt>
        <Grid columns={2} gap={12} label="Your groups">
          {groupRows(model).map((g) => (
            <Panel key={g.id} background="surface" radius="lg">
              <Col padding={14} gap={6}>
                <Avatar size={40}>{g.init}</Avatar>
                <Txt>
                  <Span weight="bold">{g.name}</Span>
                </Txt>
                <Txt size="sm" color="text_muted">
                  {g.members} members
                </Txt>
                <Txt size="sm" color="accent">
                  {g.note}
                </Txt>
              </Col>
            </Panel>
          ))}
        </Grid>

        <Txt size="sm" color="text_muted">
          GROUP CHATS
        </Txt>
        <Col gap={4} label="Group chats">
          {chatRows(model).map((ch) => (
            <Row key={ch.id} gap={12} cross="center" padding={8}>
              <Avatar size={46}>{ch.init}</Avatar>
              <Col gap={2} grow={1}>
                <Row cross="center">
                  <Txt grow={1}>
                    <Span weight="bold">{ch.name}</Span>
                  </Txt>
                  <Txt size="sm" color="text_muted">
                    {ch.when}
                  </Txt>
                </Row>
                <Txt size="sm" color="text_muted">
                  {ch.last}
                </Txt>
              </Col>
              {ch.hasUnread ? <Badge>{ch.unread}</Badge> : null}
            </Row>
          ))}
        </Col>
      </Col>
    </ScrollView>
  );
}
