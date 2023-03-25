import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import { CloudWatchLogGroup } from "aws-cdk-lib/aws-events-targets";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export class LogTarget extends Construct {
    constructor(scope: Construct, id: string, props: LogTargetProps) {
        super(scope, id);

        const logGroup = new LogGroup(this, 'OutboxOutput', {
            logGroupName: '/aws/events/' + props.name + '-outbox-event-log'
          });

          const rule = new Rule(this, 'EventsToLog', {
            eventBus: props.bus,
            eventPattern: {
              account: [ props.account ]
            }
          });

          rule.addTarget(new CloudWatchLogGroup(logGroup));
    }
}

export interface LogTargetProps{
    name: string,
    bus: EventBus,
    account: string
}